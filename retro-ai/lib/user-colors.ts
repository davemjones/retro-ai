import { prisma } from "./prisma";

/**
 * Pool of approved vibrant colors for user avatars and sticky notes.
 * Excludes black, white, and colors too close to those values.
 */
const USER_COLOR_POOL = [
  "#FFE066", // Bright yellow
  "#FF6B9D", // Pink
  "#4ECDC4", // Teal
  "#95E1D3", // Mint green
  "#FFA07A", // Light salmon
  "#C3A6FF", // Light purple
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#EC4899", // Pink
];

/**
 * Generates a random color from the approved color pool.
 * @returns A hex color string (e.g., "#FFE066")
 */
export function generateRandomUserColor(): string {
  const randomIndex = Math.floor(Math.random() * USER_COLOR_POOL.length);
  return USER_COLOR_POOL[randomIndex];
}

/**
 * Assigns a random color to an existing user in the database.
 * @param userId - The ID of the user to assign a color to
 * @returns The assigned color string
 */
export async function assignUserColor(userId: string): Promise<string> {
  const color = generateRandomUserColor();
  
  await prisma.user.update({
    where: { id: userId },
    data: { color },
  });
  
  return color;
}

/**
 * Assigns colors to all users who don't currently have one.
 * @returns Number of users updated
 */
export async function assignColorsToExistingUsers(): Promise<number> {
  const usersWithoutColors = await prisma.user.findMany({
    where: {
      color: null,
    },
    select: {
      id: true,
    },
  });

  let updatedCount = 0;
  
  for (const user of usersWithoutColors) {
    await assignUserColor(user.id);
    updatedCount++;
  }
  
  return updatedCount;
}