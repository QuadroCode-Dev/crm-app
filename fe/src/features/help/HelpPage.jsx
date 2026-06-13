import { Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import PageHeader from '../../shared/components/PageHeader.jsx';
import useLanguage from '../../shared/hooks/useLanguage.js';
import './help.css';

const helpSections = [
  {
    feature: 'Dashboard',
    title: 'Start with the dashboard',
    body: 'Use the dashboard to see pipeline totals, overdue tasks, recent activity, and quick shortcuts.',
  },
  {
    feature: 'Pipeline',
    title: 'Manage leads in the pipeline',
    body: 'Open Pipeline to move leads between stages. Open Leads when you need filters, details, notes, and linked tasks.',
  },
  {
    feature: 'Tasks',
    title: 'Keep follow-up work visible',
    body: 'Use Tasks to assign next steps, track due dates, and complete follow-ups before they become overdue.',
  },
  {
    feature: 'Reports',
    title: 'Review performance',
    body: 'Use Reports to monitor lead sources, pipeline health, stage aging, and task volume.',
  },
  {
    feature: 'Settings',
    title: 'Adjust workspace settings',
    body: 'Use Settings to update stages, automation rules, integrations, branding, theme, and interface size.',
  },
];

function HelpPage() {
  const { t } = useLanguage();
  const [activeFeature, setActiveFeature] = useState('All features');
  const [searchTerm, setSearchTerm] = useState('');

  const featureOptions = useMemo(
    () => ['All features', ...helpSections.map((section) => section.feature)],
    [],
  );

  const filteredSections = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return helpSections.filter((section) => {
      const matchesFeature =
        activeFeature === 'All features' || section.feature === activeFeature;

      if (!matchesFeature) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [section.feature, section.title, section.body]
        .map((value) => t(value).toLowerCase())
        .some((value) => value.includes(normalizedSearch));
    });
  }, [activeFeature, searchTerm, t]);

  return (
    <Stack spacing={2} className="crm-help-page">
      <PageHeader
        title={t('Help')}
        description={t('A short guide to the main CRM workflows.')}
      />

      <TextField
        fullWidth
        label={t('Search help')}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={t('Search by feature or task')}
        size="small"
        value={searchTerm}
      />

      <div className="crm-help-page__layout">
        <Card className="crm-card crm-help-page__features-card">
          <CardContent className="crm-help-page__features-content">
            <Typography variant="subtitle2">{t('Features')}</Typography>
            <Stack spacing={0.75}>
              {featureOptions.map((feature) => (
                <Button
                  key={feature}
                  className="crm-help-page__feature-button"
                  color={activeFeature === feature ? 'primary' : 'inherit'}
                  onClick={() => setActiveFeature(feature)}
                  variant={activeFeature === feature ? 'contained' : 'text'}
                >
                  {t(feature)}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <div className="crm-help-page__grid">
          {filteredSections.length > 0 ? (
            filteredSections.map((section) => (
              <Card key={section.title} className="crm-card">
                <CardContent className="crm-help-page__card-content">
                  <Typography variant="caption" className="crm-help-page__feature-label">
                    {t(section.feature)}
                  </Typography>
                  <Typography variant="h6">{t(section.title)}</Typography>
                  <Typography className="crm-muted-text">{t(section.body)}</Typography>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="crm-card crm-help-page__empty-card">
              <CardContent className="crm-help-page__card-content">
                <Typography variant="h6">{t('No help topics found')}</Typography>
                <Typography className="crm-muted-text">
                  {t('Try a different search term or choose another feature.')}
                </Typography>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Stack>
  );
}

export default HelpPage;
