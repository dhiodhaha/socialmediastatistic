import { getIndividualReportAccountOptions } from "@/modules/individual-reports/actions/individual-report.actions";
import { IndividualQuarterlyReportClient } from "@/modules/individual-reports/components/individual-quarterly-report-client";
import { DemoModeNotice } from "@/shared/components/demo-mode-notice";
import { isDemoMode } from "@/shared/lib/demo-mode";

export const dynamic = "force-dynamic";

export default async function IndividualReportsPage() {
    const accounts = await getIndividualReportAccountOptions();

    return (
        <div className="mx-auto flex max-w-7xl flex-col space-y-8 p-10">
            <div>
                <div className="text-sm font-medium text-blue-600">Future Reports</div>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Individual Quarterly Report
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
                    Manual one-account, one-platform, one-quarter workflow for future content-level
                    reporting. The foundation prepares an objective draft and credit estimate
                    without running live API calls.
                </p>
            </div>

            {isDemoMode && <DemoModeNotice />}

            <IndividualQuarterlyReportClient accounts={accounts} demoMode={isDemoMode} />
        </div>
    );
}
