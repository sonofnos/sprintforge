export interface BurndownPoint {
  day: string;
  idealRemaining: number;
  actualRemaining: number;
}

/**
 * Pure function so the day-by-day math can be unit tested without a database.
 * `completedPointsByDay` maps an ISO date (yyyy-mm-dd) to points completed that day.
 */
export function computeBurndownSeries(
  days: string[],
  totalPoints: number,
  completedPointsByDay: Map<string, number>,
): BurndownPoint[] {
  const totalDays = Math.max(days.length - 1, 1);
  let cumulativeCompleted = 0;

  return days.map((day, index) => {
    cumulativeCompleted += completedPointsByDay.get(day) ?? 0;
    const ideal = totalPoints - (totalPoints / totalDays) * index;
    return {
      day,
      idealRemaining: Math.max(Math.round(ideal * 10) / 10, 0),
      actualRemaining: Math.max(totalPoints - cumulativeCompleted, 0),
    };
  });
}
