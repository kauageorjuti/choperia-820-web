import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const logData = await req.json();
    
    // In a real production app, this is where you would send the log
    // to DataDog, Sentry, New Relic, etc.
    
    // For now, we just output it to the server console (stdout)
    // using structured format so the terminal can capture it.
    console.log(JSON.stringify({
      _source: "api-logs-endpoint",
      ...logData
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing log in /api/logs", error);
    return NextResponse.json({ error: "Failed to process log" }, { status: 500 });
  }
}
