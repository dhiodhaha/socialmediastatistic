import { ContentAnalysisClient } from "@/modules/content-analysis/components/content-analysis-client";
import { getContentAnalysisPageDataQuery } from "@/modules/content-analysis/queries/content-analysis.queries";
import { isEditorOrAdmin } from "@/shared/lib/access-control";
import { requireAuthenticatedPage } from "@/shared/lib/authorization";

export const dynamic = "force-dynamic";

export default async function ContentAnalysisPage({
    searchParams,
}: {
    searchParams: Promise<{
        accountId?: string;
    }>;
}) {
    const session = await requireAuthenticatedPage();
    const params = await searchParams;
    const data = await getContentAnalysisPageDataQuery(params.accountId);

    return (
        <ContentAnalysisClient
            accounts={data.accounts}
            selectedAccountId={data.selectedAccountId}
            history={data.history}
            metrics={data.metrics}
            canManage={isEditorOrAdmin(session.user.role)}
        />
    );
}
