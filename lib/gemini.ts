import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateRetailInsight(context: {
  revenueCurrent: number;
  revenuePrev: number;
  topCategory: string;
  returnRate: number;
  topProduct: string;
  lowStockCount: number;
  anomalyCount: number;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const revChange = context.revenuePrev > 0
    ? (((context.revenueCurrent - context.revenuePrev) / context.revenuePrev) * 100).toFixed(1)
    : '0';
  const direction = Number(revChange) >= 0 ? 'up' : 'down';

  const prompt = `You are a concise retail analytics assistant. Write a 3-4 sentence plain-English weekly business summary based on this data:
- Revenue is ${direction} ${Math.abs(Number(revChange))}% vs last week (current: $${context.revenueCurrent.toFixed(0)})
- Best performing category: ${context.topCategory}
- Top product: ${context.topProduct}
- Return rate: ${(context.returnRate * 100).toFixed(1)}%
- Low stock alerts: ${context.lowStockCount} products
- Revenue anomalies detected: ${context.anomalyCount}

Keep it friendly but professional. No bullet points. Focus on what matters most and one actionable recommendation.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
