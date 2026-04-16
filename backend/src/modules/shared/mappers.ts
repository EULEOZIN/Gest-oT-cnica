type DefaultView = 'dashboard' | 'daily_notes' | 'agents' | 'complaints' | 'meetings' | 'agenda' | 'schedule' | 'reports';
type IncidentStatus = 'CRITICO' | 'EM_ANALISE' | 'RESOLVIDO';
type IncidentPriority = 'CRITICO' | 'NORMAL';
type IncidentRecordType = 'error' | 'complaint';
type IncidentVisualType = 'error' | 'warning' | 'success';
type IncidentHistoryAction = 'created' | 'assumed' | 'quick_resolved' | 'status_changed' | 'notes_changed';
type MeetingStatus = 'CONFIRMADA' | 'RASCUNHO' | 'REALIZADA';
type MeetingCategory = 'primary' | 'secondary' | 'tertiary';
type DailyNoteStatus = 'EM_ANALISE' | 'REALIZADO';
type DailyNoteCategory = 'ALTA_PRIORIDADE' | 'OPERACIONAL' | 'DOCUMENTACAO';
type DailyNoteDeadlinePreset = 'ONE_DAY' | 'ONE_WEEK' | 'CUSTOM';
type NotificationSource = 'meeting' | 'daily_note';
type NotificationKind = 'created' | 'updated' | 'completed' | 'deleted' | 'morning_alert';
type ReportExportStatus = 'CONCLUIDO' | 'FALHA';

const asDate = (value?: string | null) => (value ? new Date(value) : null);
const asDateOnly = (value?: string | null) => (value ? new Date(`${value}T00:00:00.000Z`) : null);

export const parseDefaultView = (value?: string | null): DefaultView => {
  switch (value) {
    case 'daily-notes': return 'daily_notes';
    case 'agents': return 'agents';
    case 'complaints': return 'complaints';
    case 'meetings': return 'meetings';
    case 'agenda': return 'agenda';
    case 'schedule': return 'schedule';
    case 'reports': return 'reports';
    default: return 'dashboard';
  }
};

export const formatDefaultView = (value: DefaultView) => value === 'daily_notes' ? 'daily-notes' : value;

export const parseIncidentStatus = (value?: string | null): IncidentStatus => {
  switch (value) {
    case 'Crítico': return 'CRITICO';
    case 'Resolvido': return 'RESOLVIDO';
    default: return 'EM_ANALISE';
  }
};

export const formatIncidentStatus = (value: IncidentStatus) => {
  switch (value) {
    case 'CRITICO': return 'Crítico';
    case 'RESOLVIDO': return 'Resolvido';
    default: return 'Em Análise';
  }
};

export const parseIncidentPriority = (value?: string | null): IncidentPriority => {
  const normalized = value?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized === 'critico' ? 'CRITICO' : 'NORMAL';
};

export const formatIncidentPriority = (value: IncidentPriority) => value === 'CRITICO' ? 'Crítico' : 'Normal';

export const parseIncidentRecordType = (value?: string | null): IncidentRecordType => value === 'error' ? 'error' : 'complaint';
export const parseIncidentVisualType = (value?: string | null): IncidentVisualType => value === 'success' ? 'success' : value === 'error' ? 'error' : 'warning';
export const parseIncidentHistoryAction = (value?: string | null): IncidentHistoryAction => {
  switch (value) {
    case 'assumed': return 'assumed';
    case 'quick_resolved': return 'quick_resolved';
    case 'status_changed': return 'status_changed';
    case 'notes_changed': return 'notes_changed';
    default: return 'created';
  }
};

export const parseMeetingStatus = (value?: string | null): MeetingStatus => value === 'Rascunho' ? 'RASCUNHO' : value === 'Realizada' ? 'REALIZADA' : 'CONFIRMADA';
export const formatMeetingStatus = (value: MeetingStatus) => value === 'RASCUNHO' ? 'Rascunho' : value === 'REALIZADA' ? 'Realizada' : 'Confirmada';
export const parseMeetingCategory = (value?: string | null): MeetingCategory => value === 'secondary' ? 'secondary' : value === 'tertiary' ? 'tertiary' : 'primary';

export const parseDailyNoteStatus = (value?: string | null): DailyNoteStatus => value === 'Realizado' ? 'REALIZADO' : 'EM_ANALISE';
export const formatDailyNoteStatus = (value: DailyNoteStatus) => value === 'REALIZADO' ? 'Realizado' : 'Em Análise';
export const parseDailyNoteCategory = (value?: string | null): DailyNoteCategory | null => value === 'Alta Prioridade' ? 'ALTA_PRIORIDADE' : value === 'Documentação' ? 'DOCUMENTACAO' : value ? 'OPERACIONAL' : null;
export const formatDailyNoteCategory = (value: DailyNoteCategory | null) => value === 'ALTA_PRIORIDADE' ? 'Alta Prioridade' : value === 'DOCUMENTACAO' ? 'Documentação' : value === 'OPERACIONAL' ? 'Operacional' : undefined;
export const parseDeadlinePreset = (value?: string | null): DailyNoteDeadlinePreset | null => value === '1 Dia' ? 'ONE_DAY' : value === '1 Semana' ? 'ONE_WEEK' : value === 'Personalizado' ? 'CUSTOM' : null;
export const formatDeadlinePreset = (value: DailyNoteDeadlinePreset | null) => value === 'ONE_DAY' ? '1 Dia' : value === 'ONE_WEEK' ? '1 Semana' : value === 'CUSTOM' ? 'Personalizado' : undefined;

export const parseNotificationSource = (value?: string | null): NotificationSource => value === 'meeting' ? 'meeting' : 'daily_note';
export const formatNotificationSource = (value: NotificationSource) => value === 'meeting' ? 'meeting' : 'daily-note';
export const parseNotificationKind = (value?: string | null): NotificationKind => {
  switch (value) {
    case 'updated': return 'updated';
    case 'completed': return 'completed';
    case 'deleted': return 'deleted';
    case 'morning_alert': return 'morning_alert';
    default: return 'created';
  }
};

export const parseReportExportStatus = (value?: string | null): ReportExportStatus => value === 'FALHA' ? 'FALHA' : 'CONCLUIDO';
export const formatReportExportStatus = (value: ReportExportStatus) => value === 'FALHA' ? 'FALHA' : 'CONCLUÍDO';

export const helpers = { asDate, asDateOnly };
