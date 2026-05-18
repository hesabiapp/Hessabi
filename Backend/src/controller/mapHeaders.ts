import { Request, Response } from "express";

const fieldsByType: Record<string, string[]> = {
    sales: ["invoice", "date", "customer", "payment", "productName", "size", "quantity", "price"],
    expenses: ["date", "category", "description", "amount", "paymentMethod", "notes"]
};

export const mapHeaders = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(400).json({ message: "Input is required." });
    }

    const excelHeaders: string[] = req.body.headers;
    const type: string = req.body.type || "sales";
    const fields = fieldsByType[type] ?? fieldsByType["sales"];

    if (!excelHeaders || !Array.isArray(excelHeaders) || excelHeaders.length === 0) {
        return res.status(400).json({ message: "No headers provided." });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 1000,
            messages: [{
                role: "user",
                content: `You are a data mapper. I have an Excel file with these column headers (0-indexed):
${excelHeaders.map((h: string, i: number) => `${i}: "${h}"`).join("\n")}

Map each header to one of these system fields (or -1 if no match):
- ${fields.join(", ")}

Reply ONLY with a valid JSON object. No explanation, no markdown, just raw JSON.
Example: {${fields.map((f, i) => `"${f}": ${i}`).join(", ")}}`
            }]
        })
    });

    const data = await response.json();

    if (!data.content) {
        return res.status(500).json({ message: "Anthropic API error", detail: data });
    }

    const rawText = data.content
        .map((c: any) => c.type === "text" ? c.text : "")
        .join("")
        .replace(/```json|```/g, "")
        .trim();

    try {
        return res.status(200).json({ mapping: JSON.parse(rawText) });
    } catch (e) {
        return res.status(500).json({ message: "Failed to parse AI response", raw: rawText });
    }
};
