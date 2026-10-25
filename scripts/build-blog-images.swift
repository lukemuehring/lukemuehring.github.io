// Makes the image files the blog serves for each photo, from the full-size originals:
//
//   - one full-resolution AVIF, which the photo viewer opens, and
//   - smaller display copies, 1024 and 2048px wide, which make up the srcset the post
//     column picks from.
//
// It also strips the GPS location from every file, and 
// writes each photo's pixel size to src/data/blog-image-dims.json for skeletons.
//
//   blog-originals/<post>/       Full-size exports from Photos. Gitignored: at 7-30MB
//                                each, one post's worth is past what Pages will host.

//   images/blog/<post>/          The full-resolution files the posts import and the
//                                photo viewer opens. Made from blog-originals as AVIF;
//                                older posts keep the JPEGs and PNGs they began with.

//   images/blog/<post>/display/  The copies a post shows in its column, one per
//                                DISPLAY_WIDTHS entry. lib/blogImages finds them.
//
// ImageIO, the system's own codec, keeps the Display P3 colour profile, reads HEIC, and
// can drop GPS from a JPEG without recompressing it.
//
// Run after adding, replacing or removing photos:
//
//     swift scripts/build-blog-images.swift
//
// Only out-of-date outputs are rebuilt, judged by modification time.

import Foundation
import ImageIO

let ROOT = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()
    .deletingLastPathComponent()
let ORIGINALS_DIR = ROOT.appendingPathComponent("blog-originals")
let BLOG_DIR = ROOT.appendingPathComponent("images/blog")
let MANIFEST = ROOT.appendingPathComponent("src/data/blog-image-dims.json")
let DISPLAY_DIR_NAME = "display"

/// About 37% the size of a Photos JPEG export, with no difference to find at 100% zoom.
let FULL_QUALITY = 0.9
/// Indistinguishable from the full-resolution file at the size the column shows it.
let DISPLAY_QUALITY = 0.6
/// The column tops out at 896 CSS px (BlogPost's md:max-w-4xl): 2048 covers that on a
/// 2x screen, 1024 covers phones and 1x screens.
let DISPLAY_WIDTHS = [1024, 2048]

let ORIGINAL_EXTENSIONS: Set<String> = ["jpg", "jpeg", "png", "heic", "heif"]
let FULL_EXTENSIONS: Set<String> = ["jpg", "jpeg", "png", "avif", "webp"]

let outputLock = NSLock()
var errors: Array<String> = []

/**
 * Records a problem to report at the end, without stopping the rest of the run.
 * @param message - What went wrong, naming the file.
 */
func fail(_ message: String) {
    outputLock.lock()
    errors.append(message)
    outputLock.unlock()
}

/**
 * Prints one line, whole, from any of the encoding threads.
 * @param message - The line to print.
 */
func log(_ message: String) {
    outputLock.lock()
    print(message)
    outputLock.unlock()
}

/**
 * Lists a directory's entries.
 * @param directory - The directory to list; a missing one is empty.
 * @returns Its entries, sorted by name.
 */
func entries(in directory: URL) -> Array<URL> {
    let fileManager = FileManager.default
    let names = (try? fileManager.contentsOfDirectory(atPath: directory.path)) ?? []
    return names.sorted().map { name in directory.appendingPathComponent(name) }
}

/**
 * Lists the image files directly inside a directory.
 * @param directory - The directory to list; a missing one has no files.
 * @param extensions - Lowercase extensions to keep.
 * @returns The matching files, sorted by name.
 */
func imageFiles(in directory: URL, extensions: Set<String>) -> Array<URL> {
    entries(in: directory).filter { entry in
        extensions.contains(entry.pathExtension.lowercased())
    }
}

/**
 * Lists the post folders inside a directory.
 * @param directory - The directory to list; a missing one has no folders.
 * @returns The subdirectories, sorted by name.
 */
func postDirectories(in directory: URL) -> Array<URL> {
    entries(in: directory).filter { entry in
        var isDirectory: ObjCBool = false
        let exists = FileManager.default.fileExists(
            atPath: entry.path, isDirectory: &isDirectory)
        return exists && isDirectory.boolValue
    }
}

/**
 * Reads a file's modification time.
 * @param file - The file to check.
 * @returns When it was last written, or nil if it does not exist.
 */
func modificationDate(_ file: URL) -> Date? {
    let attributes = try? FileManager.default.attributesOfItem(atPath: file.path)
    return attributes?[.modificationDate] as? Date
}

/**
 * Checks whether an output needs making, by modification time.
 * @param output - The file that would be written.
 * @param input - The file it is made from.
 * @returns True when the output is missing or older than its input.
 */
func outputIsStale(_ output: URL, from input: URL) -> Bool {
    guard let outputDate = modificationDate(output),
        let inputDate = modificationDate(input)
    else { return true }
    return outputDate < inputDate
}

struct ImageInfo {
    let width: Int
    let height: Int
    let orientation: Int
    let hasGPS: Bool
}

/**
 * Reads an image's header.
 * @param file - The image to read.
 * @returns Its stored size, EXIF orientation and whether it carries GPS, or nil if
 *   ImageIO cannot read it.
 */
func imageInfo(_ file: URL) -> ImageInfo? {
    guard let source = CGImageSourceCreateWithURL(file as CFURL, nil),
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil)
            as? Dictionary<CFString, Any>,
        let width = properties[kCGImagePropertyPixelWidth] as? Int,
        let height = properties[kCGImagePropertyPixelHeight] as? Int
    else { return nil }
    return ImageInfo(
        width: width,
        height: height,
        orientation: properties[kCGImagePropertyOrientation] as? Int ?? 1,
        hasGPS: properties[kCGImagePropertyGPSDictionary] != nil
    )
}

/**
 * Writes a file through a temporary sibling, renamed into place once complete, so an
 * interrupted run never leaves a half-written image that looks up to date.
 * @param output - Where the file ends up. Replaced if it exists.
 * @param write - Writes the file to the temporary URL it is given.
 * @returns True if the write succeeded and the file is in place.
 */
func writeThroughTemporaryFile(to output: URL, _ write: (URL) -> Bool) -> Bool {
    let temporaryName = ".\(output.lastPathComponent).\(UUID().uuidString).tmp"
    let temporary = output.deletingLastPathComponent()
        .appendingPathComponent(temporaryName)
    guard write(temporary), rename(temporary.path, output.path) == 0 else {
        try? FileManager.default.removeItem(at: temporary)
        return false
    }
    return true
}

/**
 * Encodes an image as AVIF, keeping its colour profile and none of its metadata.
 *
 * Two Chrome limits (as of Chrome 155) shape the output. It fails to decode ImageIO's
 * AVIFs with an HDR gain map, so the photo goes out as its SDR base image. And it draws
 * one with an odd width or height as fully transparent, so an odd side loses its last
 * pixel.
 * @param input - The image to encode.
 * @param output - The .avif file to write.
 * @param quality - Lossy quality, 0 to 1.
 * @param maxPixelSize - Cap on the longer side, or nil for full size.
 * @returns True if the file was written.
 */
func encodeAVIF(
    from input: URL, to output: URL, quality: Double, maxPixelSize: Int?
) -> Bool {
    guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
        let info = imageInfo(input)
    else { return false }

    // Decoding through a thumbnail scales the photo and leaves its metadata behind,
    // GPS and gain map included. The colour profile rides on the image itself.
    let longerSide = max(info.width, info.height)
    let thumbnailOptions: Dictionary<CFString, Any> = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxPixelSize ?? longerSide
    ]
    guard let image = CGImageSourceCreateThumbnailAtIndex(
            source, 0, thumbnailOptions as CFDictionary)
    else { return false }
    let evenSize = CGRect(
        x: 0, y: 0, width: image.width / 2 * 2, height: image.height / 2 * 2)
    guard let evenImage = image.cropping(to: evenSize) else { return false }

    return writeThroughTemporaryFile(to: output) { temporary in
        guard let destination = CGImageDestinationCreateWithURL(
            temporary as CFURL, "public.avif" as CFString, 1, nil)
        else { return false }
        let options = [kCGImageDestinationLossyCompressionQuality: quality]
        CGImageDestinationAddImage(destination, evenImage, options as CFDictionary)
        return CGImageDestinationFinalize(destination)
    }
}

/**
 * Removes the GPS location from an image in place, without recompressing it.
 * @param file - The image to rewrite.
 * @returns True if the file was rewritten.
 */
func removeGPS(from file: URL) -> Bool {
    guard let source = CGImageSourceCreateWithURL(file as CFURL, nil),
        let type = CGImageSourceGetType(source)
    else { return false }
    return writeThroughTemporaryFile(to: file) { temporary in
        guard let destination = CGImageDestinationCreateWithURL(
            temporary as CFURL, type, 1, nil)
        else { return false }
        let options = [kCGImageMetadataShouldExcludeGPS: true] as CFDictionary
        return CGImageDestinationCopyImageSource(destination, source, options, nil)
    }
}

/**
 * Runs encoding jobs across every core.
 * @param jobs - The work to run; each reports its own failures through fail().
 */
func runConcurrently(_ jobs: Array<() -> Void>) {
    DispatchQueue.concurrentPerform(iterations: jobs.count) { index in jobs[index]() }
}

/**
 * Shortens a path for printing.
 * @param file - A file inside the repo.
 * @returns The path from the repo root.
 */
func relativePath(_ file: URL) -> String {
    file.path.replacingOccurrences(of: ROOT.path + "/", with: "")
}

// 1. Originals -> full-resolution AVIFs.

var fullResolutionJobs: Array<() -> Void> = []
for originalsDirectory in postDirectories(in: ORIGINALS_DIR) {
    let postDirectory = BLOG_DIR.appendingPathComponent(
        originalsDirectory.lastPathComponent)
    try FileManager.default.createDirectory(
        at: postDirectory, withIntermediateDirectories: true)

    let originals = imageFiles(in: originalsDirectory, extensions: ORIGINAL_EXTENSIONS)
    for original in originals {
        let output = postDirectory
            .appendingPathComponent(original.deletingPathExtension().lastPathComponent)
            .appendingPathExtension("avif")
        guard outputIsStale(output, from: original) else { continue }

        fullResolutionJobs.append {
            let isWritten = encodeAVIF(
                from: original, to: output, quality: FULL_QUALITY, maxPixelSize: nil)
            guard isWritten else {
                return fail("could not encode \(relativePath(original))")
            }
            log("wrote \(relativePath(output))")
        }
    }
}
runConcurrently(fullResolutionJobs)

// 2. Each full-resolution file -> GPS removed, display copies, a manifest entry.

var dimensions: Dictionary<String, Array<Int>> = [:]
var owners: Dictionary<String, URL> = [:]
var displayJobs: Array<() -> Void> = []

for postDirectory in postDirectories(in: BLOG_DIR) {
    let displayDirectory = postDirectory.appendingPathComponent(DISPLAY_DIR_NAME)
    try FileManager.default.createDirectory(
        at: displayDirectory, withIntermediateDirectories: true)
    var expectedDisplayCopies: Set<String> = []

    for image in imageFiles(in: postDirectory, extensions: FULL_EXTENSIONS) {
        // Keyed by stem, because that is all lib/blogImages has to go on: the bundler
        // rewrites these to /assets/<stem>-<hash>.<ext>, losing the directory.
        let stem = image.deletingPathExtension().lastPathComponent
        if let owner = owners[stem] {
            fail(
                "duplicate image name \(stem): \(relativePath(owner)) and "
                    + "\(relativePath(image)). Blog image names have to be unique "
                    + "across posts - rename one.")
            continue
        }
        owners[stem] = image

        guard let info = imageInfo(image) else {
            fail("could not read \(relativePath(image))")
            continue
        }
        // The copies would keep the rotation tag while the manifest and srcset widths
        // came out sideways. Photos exports upright, so the fix is to re-export.
        guard info.orientation == 1 else {
            fail(
                "\(relativePath(image)) is stored rotated "
                    + "(EXIF orientation \(info.orientation)) - re-export it upright.")
            continue
        }
        if info.hasGPS {
            guard removeGPS(from: image) else {
                fail("could not remove GPS from \(relativePath(image))")
                continue
            }
            log("removed GPS from \(relativePath(image))")
        }
        dimensions[stem] = [info.width, info.height]

        for width in DISPLAY_WIDTHS where width < info.width {
            let outputName = "\(stem)-\(width).avif"
            let output = displayDirectory.appendingPathComponent(outputName)
            expectedDisplayCopies.insert(output.lastPathComponent)
            guard outputIsStale(output, from: image) else { continue }

            // ImageIO caps the longer side, so a portrait photo's cap is its height.
            let longerSide = max(info.width, info.height)
            let maxPixelSize = Int(
                (Double(width * longerSide) / Double(info.width)).rounded())
            displayJobs.append {
                let isWritten = encodeAVIF(
                    from: image, to: output, quality: DISPLAY_QUALITY,
                    maxPixelSize: maxPixelSize)
                guard isWritten else {
                    return fail("could not encode \(relativePath(output))")
                }
                log("wrote \(relativePath(output))")
            }
        }
    }

    // A removed or renamed photo would otherwise leave its copies in the bundle.
    for displayCopy in imageFiles(in: displayDirectory, extensions: ["avif"])
    where !expectedDisplayCopies.contains(displayCopy.lastPathComponent) {
        try FileManager.default.removeItem(at: displayCopy)
        log("removed \(relativePath(displayCopy))")
    }
}
runConcurrently(displayJobs)

// 3. The manifest, laid out as the old Python script wrote it, to keep diffs small.

if errors.isEmpty {
    let manifestEntries = dimensions.keys.sorted().map { stem in
        let size = dimensions[stem]!
        return "  \"\(stem)\": [\n    \(size[0]),\n    \(size[1])\n  ]"
    }
    let json = "{\n" + manifestEntries.joined(separator: ",\n") + "\n}\n"
    try json.write(to: MANIFEST, atomically: true, encoding: .utf8)
    print("wrote \(dimensions.count) entries to \(relativePath(MANIFEST))")
} else {
    for error in errors {
        FileHandle.standardError.write(Data((error + "\n").utf8))
    }
    FileHandle.standardError.write(Data("manifest not written\n".utf8))
    exit(1)
}
