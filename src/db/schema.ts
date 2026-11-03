import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const accountKind = pgEnum('account_kind', ['system', 'member']);
export const systemRole = pgEnum('system_role', ['president', 'vice_president', 'secretary']);
export const memberStatus = pgEnum('member_status', ['onboarded', 'offboarded']);
export const projectStatus = pgEnum('project_status', ['open', 'on_progress', 'done', 'cancelled']);
export const mediaPurpose = pgEnum('media_purpose', ['gallery', 'logo', 'avatar', 'carousel']);
export const mediaKind = pgEnum('media_kind', ['image', 'video']);
export const mediaSource = pgEnum('media_source', ['upload', 'drive', 'youtube']);
export const requestStatus = pgEnum('request_status', ['pending', 'approved', 'rejected']);
export const timelineStatus = pgEnum('timeline_status', ['not_yet', 'done']);
export const timelineRequestKind = pgEnum('timeline_request_kind', ['status', 'dates']);

export type ProjectStatus = (typeof projectStatus.enumValues)[number];
/** Project selesai atau batal: anggota dan timeline dikunci. */
export const LOCKED_STATUSES: readonly ProjectStatus[] = ['done', 'cancelled'];

const id = () => uuid('id').primaryKey().defaultRandom();
const stamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const accounts = pgTable('accounts', {
  id: id(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  kind: accountKind('kind').notNull().default('member'),
  systemRole: systemRole('system_role'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...stamps(),
});

export const media = pgTable(
  'media',
  {
    id: id(),
    purpose: mediaPurpose('purpose').notNull(),
    kind: mediaKind('kind').notNull(),
    source: mediaSource('source').notNull(),
    storageKey: text('storage_key'),
    externalId: text('external_id'),
    projectId: uuid('project_id').references((): AnyPgColumn => projects.id, { onDelete: 'cascade' }),
    activityId: uuid('activity_id').references((): AnyPgColumn => activities.id, { onDelete: 'cascade' }),
    isCover: boolean('is_cover').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    altText: text('alt_text'),
    width: integer('width'),
    height: integer('height'),
    bytes: integer('bytes'),
    mime: text('mime'),
    ...stamps(),
  },
  (t) => [
    check('media_single_owner', sql`num_nonnulls(${t.projectId}, ${t.activityId}) <= 1`),
    uniqueIndex('media_project_cover').on(t.projectId).where(sql`${t.isCover} and ${t.projectId} is not null`),
    uniqueIndex('media_activity_cover').on(t.activityId).where(sql`${t.isCover} and ${t.activityId} is not null`),
    index('media_project_idx').on(t.projectId),
    index('media_activity_idx').on(t.activityId),
  ],
);

export const members = pgTable('members', {
  id: id(),
  accountId: uuid('account_id')
    .notNull()
    .unique()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  fullName: text('full_name').notNull(),
  major: text('major').notNull().default(''),
  cohort: integer('cohort'),
  photoMediaId: uuid('photo_media_id').references(() => media.id, { onDelete: 'set null' }),
  status: memberStatus('status').notNull().default('onboarded'),
  showPhoto: boolean('show_photo').notNull().default(true),
  showMajor: boolean('show_major').notNull().default(true),
  showCohort: boolean('show_cohort').notNull().default(true),
  showPositions: boolean('show_positions').notNull().default(true),
  showActivities: boolean('show_activities').notNull().default(true),
  showProjects: boolean('show_projects').notNull().default(true),
  ...stamps(),
});

export const positions = pgTable('positions', {
  id: id(),
  name: text('name').notNull().unique(),
  grantsCommittee: boolean('grants_committee').notNull().default(false),
  isLocked: boolean('is_locked').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(100),
  ...stamps(),
});

export const memberPositions = pgTable(
  'member_positions',
  {
    id: id(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    positionId: uuid('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'restrict' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    ...stamps(),
  },
  (t) => [index('member_positions_member_idx').on(t.memberId)],
);

const contentColumns = () => ({
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  logoMediaId: uuid('logo_media_id').references((): AnyPgColumn => media.id, { onDelete: 'set null' }),
  description: text('description').notNull().default(''),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  ...stamps(),
});

export const projects = pgTable('projects', {
  ...contentColumns(),
  status: projectStatus('status').notNull().default('on_progress'),
  projectUrl: text('project_url'),
  projectUrlVisible: boolean('project_url_visible').notNull().default(false),
  githubUrl: text('github_url'),
  githubUrlVisible: boolean('github_url_visible').notNull().default(false),
  docsUrl: text('docs_url'),
  docsUrlVisible: boolean('docs_url_visible').notNull().default(false),
});

export const activities = pgTable('activities', {
  ...contentColumns(),
  activityDate: date('activity_date').notNull(),
  registrationOpen: boolean('registration_open').notNull().default(false),
  registrationUrl: text('registration_url'),
});

export const projectTimelineItems = pgTable(
  'project_timeline_items',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: timelineStatus('status').notNull().default('not_yet'),
    completedAt: date('completed_at'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...stamps(),
  },
  (t) => [check('timeline_dates', sql`${t.endDate} >= ${t.startDate}`), index('timeline_project_idx').on(t.projectId)],
);

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.memberId] })],
);

export const activityMembers = pgTable(
  'activity_members',
  {
    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.memberId] })],
);

export const involvementRequests = pgTable(
  'involvement_requests',
  {
    id: id(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'cascade' }),
    note: text('note').notNull().default(''),
    status: requestStatus('status').notNull().default('pending'),
    decidedBy: uuid('decided_by').references(() => accounts.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionNote: text('decision_note'),
    ...stamps(),
  },
  (t) => [
    check('request_single_target', sql`num_nonnulls(${t.projectId}, ${t.activityId}) = 1`),
    uniqueIndex('request_pending_project')
      .on(t.memberId, t.projectId)
      .where(sql`${t.status} = 'pending' and ${t.projectId} is not null`),
    uniqueIndex('request_pending_activity')
      .on(t.memberId, t.activityId)
      .where(sql`${t.status} = 'pending' and ${t.activityId} is not null`),
  ],
);

export const timelineRequests = pgTable(
  'timeline_requests',
  {
    id: id(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => projectTimelineItems.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    kind: timelineRequestKind('kind').notNull(),
    proposedStatus: timelineStatus('proposed_status'),
    proposedStart: date('proposed_start'),
    proposedEnd: date('proposed_end'),
    note: text('note').notNull().default(''),
    evidenceUrl: text('evidence_url'),
    status: requestStatus('status').notNull().default('pending'),
    decidedBy: uuid('decided_by').references(() => accounts.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionNote: text('decision_note'),
    ...stamps(),
  },
  (t) => [
    check(
      'timeline_request_payload',
      sql`(${t.kind} = 'status' and ${t.proposedStatus} is not null) or (${t.kind} = 'dates' and ${t.proposedStart} is not null and ${t.proposedEnd} >= ${t.proposedStart})`,
    ),
    uniqueIndex('timeline_request_pending').on(t.itemId, t.memberId, t.kind).where(sql`${t.status} = 'pending'`),
  ],
);

export type ProposalStage = { title: string; description: string; startDate: string; endDate: string };

/** Usulan project dari member. Timeline disimpan sebagai jsonb sampai usulan diterima dan disalin ke project_timeline_items. */
export const projectProposals = pgTable(
  'project_proposals',
  {
    id: id(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    timeline: jsonb('timeline').$type<ProposalStage[]>().notNull(),
    status: requestStatus('status').notNull().default('pending'),
    decidedBy: uuid('decided_by').references(() => accounts.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionNote: text('decision_note'),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    ...stamps(),
  },
  (t) => [
    check('proposal_reject_feedback', sql`${t.status} <> 'rejected' or length(trim(coalesce(${t.decisionNote}, ''))) > 0`),
    index('proposal_member_idx').on(t.memberId),
  ],
);

export const siteContent = pgTable('site_content', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => accounts.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const carouselSlides = pgTable('carousel_slides', {
  id: id(),
  mediaId: uuid('media_id')
    .notNull()
    .references(() => media.id, { onDelete: 'cascade' }),
  caption: text('caption').notNull().default(''),
  linkUrl: text('link_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  ...stamps(),
});

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_account_idx').on(t.accountId)],
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: id(),
    username: text('username').notNull(),
    ip: text('ip').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
    succeeded: boolean('succeeded').notNull(),
  },
  (t) => [index('login_attempts_lookup').on(t.username, t.attemptedAt), index('login_attempts_ip').on(t.ip, t.attemptedAt)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorAccountId: uuid('actor_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    changes: jsonb('changes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_created_idx').on(t.createdAt)],
);
