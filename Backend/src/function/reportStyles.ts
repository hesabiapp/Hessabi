import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const LOGO_BASE64 = fs.readFileSync(path.join(__dirname, '../assets/image.png')).toString('base64')

// Colours 
export const COLORS = {
  navy:   '#1e3a5f',
  dark:   '#2F4157',
  gold:   '#e6a817',
  green:  '#2e7d32',
  red:    '#c0392b',
  light:  '#f5f6fa',
  white:  '#ffffff',
  grey:   '#888888',
  border: '#e8edf2',
}

//  Formatters 
export const bhd = (n: number) => `BHD ${(n || 0).toFixed(3)}`

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

// Date filter
export const filterByDate = <T extends { date: any }>(
  items: T[],
  startDate?: string,
  endDate?: string,
): T[] => {
  if (!startDate && !endDate) return items
  return items.filter(item => {
    const d = new Date(item.date)
    if (startDate && d < new Date(startDate)) return false
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59)
      if (d > end) return false
    }
    return true
  })
}

//  HTML page wrapper 
export const htmlWrapper = (title: string, subtitle: string, body: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: ${COLORS.dark}; background: #fff; font-size: 13px; }
  .page { padding: 40px 48px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid ${COLORS.gold}; }
  .header-left h1 { font-size: 24px; font-weight: 800; color: ${COLORS.navy}; }
  .header-left p  { font-size: 12px; color: ${COLORS.grey}; margin-top: 4px; }
  .header-right   { text-align: right; }
  .header-right .date { font-size: 11px; color: ${COLORS.grey}; margin-top: 6px; }

  /* KPI cards */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
  .kpi-card { background: ${COLORS.light}; border-radius: 10px; padding: 16px; border-left: 4px solid ${COLORS.navy}; }
  .kpi-card.gold  { border-left-color: ${COLORS.gold}; }
  .kpi-card.green { border-left-color: ${COLORS.green}; }
  .kpi-card.red   { border-left-color: ${COLORS.red}; }
  .kpi-label { font-size: 10px; font-weight: 700; color: ${COLORS.grey}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .kpi-value { font-size: 18px; font-weight: 800; color: ${COLORS.navy}; }
  .kpi-value.gold  { color: ${COLORS.gold}; }
  .kpi-value.green { color: ${COLORS.green}; }
  .kpi-value.red   { color: ${COLORS.red}; }
  .kpi-sub { font-size: 10px; color: ${COLORS.grey}; margin-top: 3px; }

  /* Sections & tables */
  .section { margin-bottom: 28px; }
  .section-title { font-size: 14px; font-weight: 700; color: ${COLORS.navy}; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid ${COLORS.border}; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: ${COLORS.navy}; }
  thead th { padding: 10px 12px; text-align: left; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody tr:nth-child(even) { background: ${COLORS.light}; }
  tbody td { padding: 9px 12px; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.dark}; }

  /* Utility classes */
  .td-right  { text-align: right; }
  .td-center { text-align: center; }
  .amount { font-weight: 700; color: ${COLORS.gold}; }
  .profit { font-weight: 700; color: ${COLORS.green}; }
  .loss   { font-weight: 700; color: ${COLORS.red}; }
  .badge-cash    { background: #e8f5e9; color: ${COLORS.green}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
  .badge-benefit { background: #e3f2fd; color: #1565c0;        padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
  .bar-bg   { background: ${COLORS.border}; border-radius: 4px; height: 8px; width: 100%; }
  .bar-fill { background: linear-gradient(90deg, ${COLORS.navy}, ${COLORS.gold}); border-radius: 4px; height: 8px; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid ${COLORS.border}; display: flex; justify-content: space-between; font-size: 10px; color: ${COLORS.grey}; }

  /* AI report body */
  .ai-body h2 { font-size: 16px; font-weight: 700; color: ${COLORS.navy}; margin: 20px 0 8px; }
  .ai-body h3 { font-size: 13px; font-weight: 700; color: ${COLORS.dark}; margin: 14px 0 6px; }
  .ai-body p  { line-height: 1.7; margin-bottom: 8px; }
  .ai-body ul { padding-left: 18px; margin-bottom: 8px; }
  .ai-body li { line-height: 1.7; }
  .ai-body strong { color: ${COLORS.navy}; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="header-right">
      <img src="data:image/png;base64,${LOGO_BASE64}" style="height:48px;width:auto;margin-bottom:6px;display:block;margin-left:auto;" />
      <div class="date">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>
  ${body}
  <div class="footer">
    <span>Hessabi Business Management System</span>
    <span>Confidential — For internal use only</span>
  </div>
</div>
</body>
</html>`

//  HTML → PDF via Puppeteer 
export const htmlToPdf = async (html: string): Promise<Buffer> => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page    = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  })
  await browser.close()
  return Buffer.from(pdf)
}