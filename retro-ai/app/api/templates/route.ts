import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      where: {
        isDefault: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: "Failed to get templates" },
      { status: 500 }
    );
  }
}