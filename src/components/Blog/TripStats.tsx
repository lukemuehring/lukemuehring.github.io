interface TripStat {
  /** The figure as it should read: "15.13", "8,342". */
  value: string;
  /** Set smaller beside the value: "mi", "ft". */
  unit?: string;
  label: string;
}

interface TripSplit {
  /** Where the leg went: "To the base of Thunderbolt". */
  label: string;
  time: string;
}

interface TripStatsProps {
  /** The headline numbers, set large in a row; two to a row on a phone. */
  stats: Array<TripStat>;
  /** The legs of the day, listed under the numbers. */
  splits?: Array<TripSplit>;
}

/**
 * The numbers from a day out, in a card: each one set large over its label, like a trail
 * listing's, with the day's legs and how long each took listed under them.
 */
export default function TripStats(props: TripStatsProps) {
  const { stats, splits } = props;
  /**
   * `.blog *` in Blog.css paints background, colour and font on every element.
   * Unlayered CSS outranks Tailwind's layered utilities,
   * so the classes setting those carry the ! modifier.
   */
  return (
    <div className="flex flex-col gap-6 w-fit mx-auto my-8 p-5 md:p-7 rounded-2xl bg-black/4! dark:bg-white/5! **:bg-transparent!">
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:flex md:gap-x-16">
        {stats?.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-1 text-3xl md:text-[2.75rem] font-bold leading-none lining-nums font-(family-name:--font-display)!">
              {stat.value}
              {stat.unit && (
                <div className="text-lg md:text-xl font-semibold font-(family-name:--font-display)!">
                  {stat.unit}
                </div>
              )}
            </div>
            <div className="text-base leading-snug text-(--font-color-light-secondary)! dark:text-(--font-color-dark-secondary)!">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      {splits && splits.length > 0 && (
        <div className="pt-5 border-t border-current/12 dark:border-current/14 text-base leading-snug">
          <div className="flex flex-col gap-2 md:w-fit">
            {splits.map((split) => (
              <div key={split.label} className="flex justify-between gap-4 md:gap-12">
                <div className="text-(--font-color-light-secondary)! dark:text-(--font-color-dark-secondary)!">
                  {split.label}
                </div>
                <div className="flex-none font-semibold">{split.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
