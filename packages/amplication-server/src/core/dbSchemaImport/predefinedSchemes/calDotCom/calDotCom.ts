export const calDotComPredefinedSchema = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["filterJson", "interactiveTransactions"]
}

generator zod {
  provider      = "zod-prisma"
  output        = "./zod"
  imports       = "./zod-utils"
  relationModel = "default"
}

enum SchedulingType {
  ROUND_ROBIN @map("roundRobin")
  COLLECTIVE  @map("collective")
}

enum PeriodType {
  UNLIMITED @map("unlimited")
  ROLLING   @map("rolling")
  RANGE     @map("range")
}

model EventType {
  id                      Int                     @id @default(autoincrement())
  /// @zod.nonempty()
  title                   String
  /// @zod.custom(imports.eventTypeSlug)
  slug                    String
  description             String?
  position                Int                     @default(0)
  /// @zod.custom(imports.eventTypeLocations)
  locations               Json?
  length                  Int
  hidden                  Boolean                 @default(false)
  users                   User[]                  @relation("user_eventtype")
  userId                  Int?
  team                    Team?                   @relation(fields: [teamId], references: [id])
  teamId                  Int?
  hashedLink              HashedLink?
  bookings                Booking[]
  availability            Availability[]
  webhooks                Webhook[]
  destinationCalendar     DestinationCalendar?
  eventName               String?
  customInputs            EventTypeCustomInput[]
  timeZone                String?
  periodType              PeriodType              @default(UNLIMITED)
  periodStartDate         DateTime?
  periodEndDate           DateTime?
  periodDays              Int?
  periodCountCalendarDays Boolean?
  requiresConfirmation    Boolean                 @default(false)
  /// @zod.custom(imports.recurringEventType)
  recurringEvent          Json?
  disableGuests           Boolean                 @default(false)
  hideCalendarNotes       Boolean                 @default(false)
  minimumBookingNotice    Int                     @default(120)
  beforeEventBuffer       Int                     @default(0)
  afterEventBuffer        Int                     @default(0)
  seatsPerTimeSlot        Int?
  schedulingType          SchedulingType?
  schedule                Schedule?               @relation(fields: [scheduleId], references: [id])
  scheduleId              Int?
  price                   Int                     @default(0)
  currency                String                  @default("usd")
  slotInterval            Int?
  metadata                Json?
  successRedirectUrl      String?
  workflows               WorkflowsOnEventTypes[]

  @@unique([userId, slug])
  @@unique([teamId, slug])
}

model Credential {
  id                   Int                   @id @default(autoincrement())
  type                 String
  key                  Json
  user                 User?                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId               Int?
  app                  App?                  @relation(fields: [appId], references: [slug], onDelete: Cascade)
  // How to make it a required column?
  appId                String?
  destinationCalendars DestinationCalendar[]
}

enum UserPlan {
  FREE
  TRIAL
  PRO
}

enum IdentityProvider {
  CAL
  GOOGLE
  SAML
}

model DestinationCalendar {
  id           Int         @id @default(autoincrement())
  integration  String
  externalId   String
  user         User?       @relation(fields: [userId], references: [id])
  userId       Int?        @unique
  booking      Booking?    @relation(fields: [bookingId], references: [id])
  bookingId    Int?        @unique
  eventType    EventType?  @relation(fields: [eventTypeId], references: [id])
  eventTypeId  Int?        @unique
  credentialId Int?
  credential   Credential? @relation(fields: [credentialId], references: [id])
}

enum UserPermissionRole {
  USER
  ADMIN
}

model User {
  id                   Int                  @id @default(autoincrement())
  username             String?              @unique
  name                 String?
  /// @zod.email()
  email                String               @unique
  emailVerified        DateTime?
  password             String?
  bio                  String?
  avatar               String?
  timeZone             String               @default("Europe/London")
  weekStart            String               @default("Sunday")
  // DEPRECATED - TO BE REMOVED
  startTime            Int                  @default(0)
  endTime              Int                  @default(1440)
  // </DEPRECATED>
  bufferTime           Int                  @default(0)
  hideBranding         Boolean              @default(false)
  theme                String?
  createdDate          DateTime             @default(now()) @map(name: "created")
  trialEndsAt          DateTime?
  eventTypes           EventType[]          @relation("user_eventtype")
  credentials          Credential[]
  teams                Membership[]
  bookings             Booking[]
  schedules            Schedule[]
  defaultScheduleId    Int?
  selectedCalendars    SelectedCalendar[]
  completedOnboarding  Boolean              @default(false)
  locale               String?
  timeFormat           Int?                 @default(12)
  twoFactorSecret      String?
  twoFactorEnabled     Boolean              @default(false)
  identityProvider     IdentityProvider     @default(CAL)
  identityProviderId   String?
  availability         Availability[]
  invitedTo            Int?
  plan                 UserPlan             @default(TRIAL)
  webhooks             Webhook[]
  brandColor           String               @default("#292929")
  darkBrandColor       String               @default("#fafafa")
  // the location where the events will end up
  destinationCalendar  DestinationCalendar?
  away                 Boolean              @default(false)
  // participate in dynamic group booking or not
  allowDynamicBooking  Boolean?             @default(true)
  /// @zod.custom(imports.userMetadata)
  metadata             Json?
  verified             Boolean?             @default(false)
  role                 UserPermissionRole   @default(USER)
  disableImpersonation Boolean              @default(false)
  impersonatedUsers    Impersonations[]     @relation("impersonated_user")
  impersonatedBy       Impersonations[]
  apiKeys              ApiKey[]
  accounts             Account[]
  sessions             Session[]
  workflows            Workflow[]

  Feedback Feedback[]

  @@map(name: "users")
}

model Team {
  id           Int          @id @default(autoincrement())
  name         String?
  slug         String?      @unique
  logo         String?
  bio          String?
  hideBranding Boolean      @default(false)
  members      Membership[]
  eventTypes   EventType[]
}

enum MembershipRole {
  MEMBER
  ADMIN
  OWNER
}

model Membership {
  id       Int            @id @default(autoincrement())
  teamId   Int
  userId   Int
  accepted Boolean        @default(false)
  role     MembershipRole
  team     Team           @relation(fields: [teamId], references: [id])
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, teamId])
}

model VerificationToken {
  id         Int      @id @default(autoincrement())
  identifier String
  token      String   @unique
  expires    DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, token])
}

model BookingReference {
  id                 Int      @id @default(autoincrement())
  type               String
  uid                String
  meetingId          String?
  meetingPassword    String?
  meetingUrl         String?
  booking            Booking? @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  bookingId          Int?
  externalCalendarId String?
  deleted            Boolean?
}

model Attendee {
  id        Int      @id @default(autoincrement())
  email     String
  name      String
  timeZone  String
  locale    String?  @default("en")
  booking   Booking? @relation(fields: [bookingId], references: [id])
  bookingId Int?
}

enum BookingStatus {
  CANCELLED @map("cancelled")
  ACCEPTED  @map("accepted")
  REJECTED  @map("rejected")
  PENDING   @map("pending")
}

model DailyEventReference {
  id         Int      @id @default(autoincrement())
  dailyurl   String   @default("dailycallurl")
  dailytoken String   @default("dailytoken")
  booking    Booking? @relation(fields: [bookingId], references: [id])
  bookingId  Int?     @unique
}

model Booking {
  id                  Int                  @id @default(autoincrement())
  uid                 String               @unique
  user                User?                @relation(fields: [userId], references: [id])
  userId              Int?
  references          BookingReference[]
  eventType           EventType?           @relation(fields: [eventTypeId], references: [id])
  eventTypeId         Int?
  title               String
  description         String?
  customInputs        Json?
  startTime           DateTime
  endTime             DateTime
  attendees           Attendee[]
  location            String?
  dailyRef            DailyEventReference?
  createdAt           DateTime             @default(now())
  updatedAt           DateTime?
  status              BookingStatus        @default(ACCEPTED)
  paid                Boolean              @default(false)
  payment             Payment[]
  destinationCalendar DestinationCalendar?
  cancellationReason  String?
  rejectionReason     String?
  dynamicEventSlugRef String?
  dynamicGroupSlugRef String?
  rescheduled         Boolean?
  fromReschedule      String?
  recurringEventId    String?
  smsReminderNumber   String?
  workflowReminders   WorkflowReminder[]
}

model Schedule {
  id           Int            @id @default(autoincrement())
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       Int
  eventType    EventType[]
  name         String
  timeZone     String?
  availability Availability[]
}

model Availability {
  id          Int        @id @default(autoincrement())
  user        User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      Int?
  eventType   EventType? @relation(fields: [eventTypeId], references: [id])
  eventTypeId Int?
  days        Int[]
  startTime   DateTime   @db.Time
  endTime     DateTime   @db.Time
  date        DateTime?  @db.Date
  Schedule    Schedule?  @relation(fields: [scheduleId], references: [id])
  scheduleId  Int?
}

model SelectedCalendar {
  id          Int    @id @default(autoincrement())
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      Int
  integration String
  externalId  String

  @@unique([userId, integration, externalId])
}

enum EventTypeCustomInputType {
  TEXT     @map("text")
  TEXTLONG @map("textLong")
  NUMBER   @map("number")
  BOOL     @map("bool")
}

model EventTypeCustomInput {
  id          Int                      @id @default(autoincrement())
  eventTypeId Int
  eventType   EventType                @relation(fields: [eventTypeId], references: [id])
  label       String
  type        EventTypeCustomInputType
  required    Boolean
  placeholder String                   @default("")
}

model ResetPasswordRequest {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  email     String
  expires   DateTime
}

enum ReminderType {
  PENDING_BOOKING_CONFIRMATION
}

model ReminderMail {
  id             Int          @id @default(autoincrement())
  referenceId    Int
  reminderType   ReminderType
  elapsedMinutes Int
  createdAt      DateTime     @default(now())
}

enum PaymentType {
  STRIPE
}

model Payment {
  id         Int         @id @default(autoincrement())
  uid        String      @unique
  type       PaymentType
  bookingId  Int
  booking    Booking?    @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  amount     Int
  fee        Int
  currency   String
  success    Boolean
  refunded   Boolean
  data       Json
  externalId String      @unique
}

enum WebhookTriggerEvents {
  BOOKING_CREATED
  BOOKING_RESCHEDULED
  BOOKING_CANCELLED
}

model Webhook {
  id              String                 @id @unique
  userId          Int?
  eventTypeId     Int?
  subscriberUrl   String
  payloadTemplate String?
  createdAt       DateTime               @default(now())
  active          Boolean                @default(true)
  eventTriggers   WebhookTriggerEvents[]
  user            User?                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  eventType       EventType?             @relation(fields: [eventTypeId], references: [id], onDelete: Cascade)
  app             App?                   @relation(fields: [appId], references: [slug], onDelete: Cascade)
  appId           String?
  secret          String?
}

model Impersonations {
  id                 Int      @id @default(autoincrement())
  createdAt          DateTime @default(now())
  impersonatedUser   User     @relation("impersonated_user", fields: [impersonatedUserId], references: [id], onDelete: Cascade)
  impersonatedBy     User     @relation(fields: [impersonatedById], references: [id], onDelete: Cascade)
  impersonatedUserId Int
  impersonatedById   Int
}

model ApiKey {
  id         String    @id @unique @default(cuid())
  userId     Int
  note       String?
  createdAt  DateTime  @default(now())
  expiresAt  DateTime?
  lastUsedAt DateTime?
  hashedKey  String    @unique()
  user       User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  app        App?      @relation(fields: [appId], references: [slug], onDelete: Cascade)
  appId      String?
}

model HashedLink {
  id          Int       @id @default(autoincrement())
  link        String    @unique()
  eventType   EventType @relation(fields: [eventTypeId], references: [id], onDelete: Cascade)
  eventTypeId Int       @unique
}

model Account {
  id                String  @id @default(cuid())
  userId            Int
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       Int
  expires      DateTime
  user         User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum AppCategories {
  calendar
  messaging
  other
  payment
  video
  web3
}

model App {
  // The slug for the app store public page inside '/apps/[slug]'
  slug        String          @id @unique
  // The directory name for '/packages/app-store/[dirName]'
  dirName     String          @unique
  // Needed API Keys
  keys        Json?
  // One or multiple categories to which this app belongs
  categories  AppCategories[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  credentials Credential[]
  Webhook     Webhook[]
  ApiKey      ApiKey[]
}

model Feedback {
  id      Int      @id @default(autoincrement())
  date    DateTime
  userId  Int
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating  String
  comment String?
}

enum WorkflowTriggerEvents {
  BEFORE_EVENT
  EVENT_CANCELLED
  NEW_EVENT
}

enum WorkflowActions {
  EMAIL_HOST
  EMAIL_ATTENDEE
  SMS_ATTENDEE
  SMS_NUMBER
}

model WorkflowStep {
  id                Int                @id @default(autoincrement())
  stepNumber        Int
  action            WorkflowActions
  workflowId        Int
  workflow          Workflow           @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  sendTo            String?
  reminderBody      String?
  emailSubject      String?
  template          WorkflowTemplates  @default(REMINDER)
  workflowReminders WorkflowReminder[]
}

model Workflow {
  id       Int                     @id @default(autoincrement())
  name     String
  userId   Int
  user     User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  activeOn WorkflowsOnEventTypes[]
  trigger  WorkflowTriggerEvents
  time     Int?
  timeUnit TimeUnit?
  steps    WorkflowStep[]
}

model WorkflowsOnEventTypes {
  id          Int       @id @default(autoincrement())
  workflow    Workflow  @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  workflowId  Int
  eventType   EventType @relation(fields: [eventTypeId], references: [id], onDelete: Cascade)
  eventTypeId Int
}

enum TimeUnit {
  DAY    @map("day")
  HOUR   @map("hour")
  MINUTE @map("minute")
}

model WorkflowReminder {
  id             Int             @id @default(autoincrement())
  bookingUid     String
  booking        Booking?        @relation(fields: [bookingUid], references: [uid], onDelete: Cascade)
  method         WorkflowMethods
  scheduledDate  DateTime
  referenceId    String?         @unique
  scheduled      Boolean
  workflowStepId Int
  workflowStep   WorkflowStep    @relation(fields: [workflowStepId], references: [id], onDelete: Cascade)
}

enum WorkflowTemplates {
  REMINDER
  CUSTOM
}

enum WorkflowMethods {
  EMAIL
  SMS
}

`;
