export const DEFAULT_LANGUAGE = 'en';

export const languageOptions = [
  { code: 'en', label: 'English', direction: 'ltr' },
  { code: 'ar', label: 'العربية', direction: 'rtl' },
];

export const resources = {
  en: {
    app: {
      brandEyebrow: 'CRM Workspace',
      brandName: 'Northstar Pipeline',
      brandDescription: 'A modern sales cockpit with room for leads, tasks, and reporting.',
      appNameFallback: 'CRM',
      workspaceLabel: 'Workspace',
      settingsLabel: 'Settings',
      salesWorkspace: 'Sales workspace',
      shellBadge: 'MVP shell',
      signedIn: 'Signed in',
      logout: 'Logout',
      openNavigation: 'Open navigation menu',
      switchToDark: 'Switch to dark mode',
      switchToLight: 'Switch to light mode',
      language: 'Language',
    },
    navigation: {
      dashboard: 'Dashboard',
      pipeline: 'Pipeline',
      leads: 'Leads',
      contacts: 'Contacts',
      tasks: 'Tasks',
      reports: 'Reports',
      pipelineStages: 'Pipeline stages',
      automationRules: 'Automation rules',
      integrations: 'Integrations',
    },
  },
  ar: {
    app: {
      brandEyebrow: 'مساحة CRM',
      brandName: 'Northstar Pipeline',
      brandDescription: 'مساحة مبيعات حديثة لإدارة العملاء والمهام والتقارير.',
      appNameFallback: 'CRM',
      workspaceLabel: 'مساحة العمل',
      settingsLabel: 'الإعدادات',
      salesWorkspace: 'مساحة المبيعات',
      shellBadge: 'نسخة أولية',
      signedIn: 'تم تسجيل الدخول',
      logout: 'تسجيل الخروج',
      openNavigation: 'فتح قائمة التنقل',
      switchToDark: 'تفعيل الوضع الداكن',
      switchToLight: 'تفعيل الوضع الفاتح',
      language: 'اللغة',
    },
    navigation: {
      dashboard: 'لوحة التحكم',
      pipeline: 'مسار المبيعات',
      leads: 'العملاء المحتملون',
      contacts: 'جهات الاتصال',
      tasks: 'المهام',
      reports: 'التقارير',
      pipelineStages: 'مراحل المسار',
      automationRules: 'قواعد الأتمتة',
      integrations: 'التكاملات',
    },
  },
};
