import fs from 'fs';
import path from 'path';

const frontendDir = path.resolve('./apps/frontend');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(frontendDir);

const replacements = [
    // Shared
    { from: /@\/components\/ui\//g, to: '@/shared/components/ui/' },
    { from: /@\/components\/catalyst\//g, to: '@/shared/components/catalyst/' },
    { from: /@\/lib\//g, to: '@/shared/lib/' },
    { from: /@\/components\/header/g, to: '@/shared/components/header' },
    { from: /@\/components\/sidebar/g, to: '@/shared/components/sidebar' },
    { from: /@\/components\/dashboard-sidebar/g, to: '@/shared/components/dashboard-sidebar' },
    { from: /@\/components\/theme-provider/g, to: '@/shared/components/theme-provider' },

    // Accounts
    { from: /@\/actions\/account(?!\.actions)/g, to: '@/modules/accounts/actions/account.actions' },
    { from: /@\/app\/actions\/account(?!\.actions)/g, to: '@/modules/accounts/actions/account.actions' },
    { from: /@\/components\/account-dialog/g, to: '@/modules/accounts/components/account-dialog' },
    { from: /@\/components\/failed-accounts-alert/g, to: '@/modules/accounts/components/failed-accounts-alert' },

    // Categories
    { from: /@\/actions\/category(?!\.actions)/g, to: '@/modules/categories/actions/category.actions' },
    { from: /@\/app\/actions\/category(?!\.actions)/g, to: '@/modules/categories/actions/category.actions' },
    { from: /@\/components\/category-dialog/g, to: '@/modules/categories/components/category-dialog' },

    // Scraping
    { from: /@\/actions\/scrape(?!\.actions)/g, to: '@/modules/scraping/actions/scrape.actions' },
    { from: /@\/app\/actions\/scrape(?!\.actions)/g, to: '@/modules/scraping/actions/scrape.actions' },
    { from: /@\/actions\/job(?!\.actions)/g, to: '@/modules/scraping/actions/job.actions' },
    { from: /@\/app\/actions\/job(?!\.actions)/g, to: '@/modules/scraping/actions/job.actions' },
    { from: /@\/actions\/data-import(?!\.actions)/g, to: '@/modules/scraping/actions/data-import.actions' },
    { from: /@\/app\/actions\/data-import(?!\.actions)/g, to: '@/modules/scraping/actions/data-import.actions' },
    { from: /@\/components\/scrape-button/g, to: '@/modules/scraping/components/scrape-button' },
    { from: /@\/components\/scrape-progress/g, to: '@/modules/scraping/components/scrape-progress' },
    { from: /@\/components\/csv-upload/g, to: '@/modules/scraping/components/csv-upload' },
    { from: /@\/components\/data-import-upload/g, to: '@/modules/scraping/components/data-import-upload' },

    // Analytics
    { from: /@\/actions\/history(?!\.actions)/g, to: '@/modules/analytics/actions/history.actions' },
    { from: /@\/app\/actions\/history(?!\.actions)/g, to: '@/modules/analytics/actions/history.actions' },
    { from: /@\/actions\/report(?!\.actions)/g, to: '@/modules/analytics/actions/report.actions' },
    { from: /@\/app\/actions\/report(?!\.actions)/g, to: '@/modules/analytics/actions/report.actions' },
    { from: /@\/components\/reports\//g, to: '@/modules/analytics/components/reports/' },
    { from: /@\/components\/reports-selectors/g, to: '@/modules/analytics/components/reports-selectors' },
    { from: /@\/components\/stats-cards/g, to: '@/modules/analytics/components/stats-cards' },
    { from: /@\/components\/history-toolbar/g, to: '@/modules/analytics/components/history-toolbar' },
    { from: /@\/components\/recent-activity/g, to: '@/modules/analytics/components/recent-activity' },
    { from: /@\/components\/export-modal/g, to: '@/modules/analytics/components/export-modal' },

    // Settings
    { from: /@\/actions\/settings(?!\.actions)/g, to: '@/modules/settings/actions/settings.actions' },
    { from: /@\/app\/actions\/settings(?!\.actions)/g, to: '@/modules/settings/actions/settings.actions' },

    // Check if any legacy relative paths need adjusting if that file was moved.
    // Given the structure, `../lib/...` etc might exist inside modules but it's simpler to catch `@/...`.
];

let changedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    for (const repl of replacements) {
        content = content.replace(repl.from, repl.to);
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedCount++;
        console.log(`Updated imports in ${path.relative(frontendDir, file)}`);
    }
}

console.log(`\nImport refactoring complete. Modified ${changedCount} files.`);
