interface ReportPdfFilenameInput {
    reportType: string;
    subject?: string | null;
    platform?: string | null;
    period?: string | null;
    comparisonPeriod?: string | null;
}

export function buildReportPdfFilename({
    reportType,
    subject,
    platform,
    period,
    comparisonPeriod,
}: ReportPdfFilenameInput) {
    const segments = [reportType, platform, subject, period];
    if (comparisonPeriod) {
        segments.push("vs", comparisonPeriod);
    }

    const filename = segments
        .map((segment) => sanitizeFilenameSegment(segment))
        .filter(Boolean)
        .join("-");

    return `${filename || "Laporan"}.pdf`;
}

function sanitizeFilenameSegment(value?: string | null) {
    if (!value) return "";

    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, " dan ")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}
