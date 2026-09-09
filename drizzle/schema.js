import { pgTable, unique, uuid, varchar, foreignKey, text, timestamp, boolean, integer, time, numeric, date, jsonb, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const roles = pgTable("roles", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
}, (table) => [
	unique("roles_name_key").on(table.name),
]);

export const userRoles = pgTable("user_roles", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
	facilityId: uuid("facility_id"),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_fkey"
		}).onDelete("cascade"),
]);

export const otpVerifications = pgTable("otp_verifications", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id"),
	channel: varchar({ length: 20 }).notNull(),
	otpHash: text("otp_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	verified: boolean().default(false),
	attemptCount: integer("attempt_count").default(0),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "otp_verifications_user_id_fkey"
		}).onDelete("cascade"),
]);

export const authSessions = pgTable("auth_sessions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	deviceId: varchar("device_id", { length: 255 }),
	refreshTokenHash: text("refresh_token_hash").notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revoked: boolean().default(false),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "auth_sessions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const doctorAvailability = pgTable("doctor_availability", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	doctorProfileId: uuid("doctor_profile_id").notNull(),
	weekday: integer().notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	slotDurationMinutes: integer("slot_duration_minutes").default(15),
	isTeleslot: boolean("is_teleslot").default(false),
}, (table) => [
	foreignKey({
			columns: [table.doctorProfileId],
			foreignColumns: [doctorProfiles.id],
			name: "doctor_availability_doctor_profile_id_fkey"
		}).onDelete("cascade"),
]);

export const doctorProfiles = pgTable("doctor_profiles", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	specialization: varchar({ length: 100 }),
	qualification: varchar({ length: 100 }),
	licenseNo: varchar("license_no", { length: 100 }).notNull(),
	experienceYears: integer("experience_years"),
	consultationModes: varchar("consultation_modes", { length: 100 }).default('in_person'),
	consultationFee: numeric("consultation_fee", { precision: 10, scale:  2 }).default('0.00'),
	name: varchar(),
	userId: uuid("user_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "doctor_profiles_user_id_fkey"
		}),
	unique("doctor_profiles_license_no_key").on(table.licenseNo),
]);

export const pharmacistProfiles = pgTable("pharmacist_profiles", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	pharmacyId: uuid("pharmacy_id"),
	licenseNo: varchar("license_no", { length: 100 }).notNull(),
	name: varchar(),
	userId: uuid("user_id"),
}, (table) => [
	foreignKey({
			columns: [table.pharmacyId],
			foreignColumns: [pharmacies.id],
			name: "fk_pharmacist_pharmacy"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "pharmacist_profiles_user_id_fkey"
		}),
	unique("pharmacist_profiles_license_no_key").on(table.licenseNo),
]);

export const receptionistProfiles = pgTable("receptionist_profiles", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "receptionist_profiles_user_id_fkey"
		}),
]);

export const appointments = pgTable("appointments", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	doctorId: uuid("doctor_id").notNull(),
	mode: varchar({ length: 20 }).default('in_person'),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }).notNull(),
	status: varchar({ length: 30 }).default('booked'),
	bookedBy: varchar("booked_by", { length: 30 }).default('patient'),
	bookedByUserId: uuid("booked_by_user_id"),
	reason: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.bookedByUserId],
			foreignColumns: [users.id],
			name: "appointments_booked_by_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctorProfiles.id],
			name: "appointments_doctor_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "appointments_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const queueTokens = pgTable("queue_tokens", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	appointmentId: uuid("appointment_id").notNull(),
	tokenNumber: integer("token_number").notNull(),
	queueDate: date("queue_date").notNull(),
	status: varchar({ length: 30 }).default('waiting'),
	checkedInAt: timestamp("checked_in_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	calledAt: timestamp("called_at", { withTimezone: true, mode: 'string' }),
	estimatedWaitMinutes: integer("estimated_wait_minutes").default(0),
}, (table) => [
	foreignKey({
			columns: [table.appointmentId],
			foreignColumns: [appointments.id],
			name: "queue_tokens_appointment_id_fkey"
		}).onDelete("cascade"),
	unique("queue_tokens_appointment_id_key").on(table.appointmentId),
]);

export const teleconsultationSessions = pgTable("teleconsultation_sessions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	appointmentId: uuid("appointment_id").notNull(),
	roomId: varchar("room_id", { length: 255 }).notNull(),
	provider: varchar({ length: 50 }).default('webrtc'),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	recordingUrl: text("recording_url"),
}, (table) => [
	foreignKey({
			columns: [table.appointmentId],
			foreignColumns: [appointments.id],
			name: "teleconsultation_sessions_appointment_id_fkey"
		}).onDelete("cascade"),
	unique("teleconsultation_sessions_appointment_id_key").on(table.appointmentId),
]);

export const consultations = pgTable("consultations", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	appointmentId: uuid("appointment_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	doctorId: uuid("doctor_id").notNull(),
	chiefComplaint: text("chief_complaint"),
	clinicalNotes: text("clinical_notes"),
	vitals: jsonb().default({}),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 30 }).default('ongoing'),
}, (table) => [
	foreignKey({
			columns: [table.appointmentId],
			foreignColumns: [appointments.id],
			name: "consultations_appointment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctorProfiles.id],
			name: "consultations_doctor_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "consultations_patient_id_fkey"
		}).onDelete("cascade"),
	unique("consultations_appointment_id_key").on(table.appointmentId),
]);

export const documents = pgTable("documents", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	uploadedByUserId: uuid("uploaded_by_user_id").notNull(),
	patientId: uuid("patient_id"),
	fileType: varchar("file_type", { length: 50 }).notNull(),
	storageUrl: text("storage_url").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
	checksum: varchar({ length: 255 }),
	encrypted: boolean().default(false),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "documents_patient_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.uploadedByUserId],
			foreignColumns: [users.id],
			name: "documents_uploaded_by_user_id_fkey"
		}).onDelete("cascade"),
]);

export const medicalRecords = pgTable("medical_records", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	consultationId: uuid("consultation_id"),
	recordType: varchar("record_type", { length: 50 }).notNull(),
	summary: text(),
	documentId: uuid("document_id"),
	createdByUserId: uuid("created_by_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.consultationId],
			foreignColumns: [consultations.id],
			name: "medical_records_consultation_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "medical_records_created_by_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "medical_records_document_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "medical_records_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const diagnoses = pgTable("diagnoses", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	consultationId: uuid("consultation_id").notNull(),
	icdCode: varchar("icd_code", { length: 50 }),
	description: text().notNull(),
	severity: varchar({ length: 20 }).default('medium'),
}, (table) => [
	foreignKey({
			columns: [table.consultationId],
			foreignColumns: [consultations.id],
			name: "diagnoses_consultation_id_fkey"
		}).onDelete("cascade"),
]);

export const followUps = pgTable("follow_ups", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	consultationId: uuid("consultation_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	doctorId: uuid("doctor_id").notNull(),
	recommendedDate: date("recommended_date").notNull(),
	instructions: text(),
	status: varchar({ length: 30 }).default('pending'),
	resultingAppointmentId: uuid("resulting_appointment_id"),
}, (table) => [
	foreignKey({
			columns: [table.consultationId],
			foreignColumns: [consultations.id],
			name: "follow_ups_consultation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctorProfiles.id],
			name: "follow_ups_doctor_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "follow_ups_patient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.resultingAppointmentId],
			foreignColumns: [appointments.id],
			name: "follow_ups_resulting_appointment_id_fkey"
		}).onDelete("set null"),
]);

export const highRiskAlerts = pgTable("high_risk_alerts", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	raisedByDoctorId: uuid("raised_by_doctor_id").notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	description: text(),
	status: varchar({ length: 30 }).default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "high_risk_alerts_patient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.raisedByDoctorId],
			foreignColumns: [doctorProfiles.id],
			name: "high_risk_alerts_raised_by_doctor_id_fkey"
		}).onDelete("cascade"),
]);

export const prescriptions = pgTable("prescriptions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	consultationId: uuid("consultation_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	doctorId: uuid("doctor_id").notNull(),
	status: varchar({ length: 30 }).default('created'),
	digitalSignature: text("digital_signature"),
	issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	validUntil: timestamp("valid_until", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.consultationId],
			foreignColumns: [consultations.id],
			name: "prescriptions_consultation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctorProfiles.id],
			name: "prescriptions_doctor_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "prescriptions_patient_id_fkey"
		}).onDelete("cascade"),
	unique("prescriptions_consultation_id_key").on(table.consultationId),
]);

export const medicines = pgTable("medicines", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	genericName: varchar("generic_name", { length: 255 }),
	brand: varchar({ length: 255 }),
	form: varchar({ length: 50 }),
	strength: varchar({ length: 50 }),
	manufacturer: varchar({ length: 255 }),
	category: varchar({ length: 100 }),
});

export const prescriptionItems = pgTable("prescription_items", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	prescriptionId: uuid("prescription_id").notNull(),
	medicineId: uuid("medicine_id"),
	medicineNameFreetext: varchar("medicine_name_freetext", { length: 255 }),
	dosage: varchar({ length: 100 }).notNull(),
	frequency: varchar({ length: 100 }).notNull(),
	duration: varchar({ length: 100 }).notNull(),
	instructions: text(),
	quantity: integer().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.medicineId],
			foreignColumns: [medicines.id],
			name: "prescription_items_medicine_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.prescriptionId],
			foreignColumns: [prescriptions.id],
			name: "prescription_items_prescription_id_fkey"
		}).onDelete("cascade"),
]);

export const pharmacies = pgTable("pharmacies", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	licenseNo: varchar("license_no", { length: 100 }).notNull(),
	acceptsTeleorders: boolean("accepts_teleorders").default(true),
	name: varchar({ length: 255 }),
	address: text(),
	phone: varchar({ length: 20 }),
	villageTown: varchar("village_town", { length: 100 }),
	district: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	pincode: varchar({ length: 20 }),
}, (table) => [
	unique("pharmacies_license_no_key").on(table.licenseNo),
]);

export const pharmacyInventory = pgTable("pharmacy_inventory", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	pharmacyId: uuid("pharmacy_id").notNull(),
	medicineId: uuid("medicine_id").notNull(),
	quantityAvailable: integer("quantity_available").default(0).notNull(),
	reorderThreshold: integer("reorder_threshold").default(10),
	expiryDate: date("expiry_date").notNull(),
	batchNo: varchar("batch_no", { length: 100 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.medicineId],
			foreignColumns: [medicines.id],
			name: "pharmacy_inventory_medicine_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.pharmacyId],
			foreignColumns: [pharmacies.id],
			name: "pharmacy_inventory_pharmacy_id_fkey"
		}).onDelete("cascade"),
]);

export const pharmacyOrders = pgTable("pharmacy_orders", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	prescriptionId: uuid("prescription_id").notNull(),
	pharmacyId: uuid("pharmacy_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	status: varchar({ length: 30 }).default('pending'),
	pharmacistNotes: text("pharmacist_notes"),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "pharmacy_orders_patient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.pharmacyId],
			foreignColumns: [pharmacies.id],
			name: "pharmacy_orders_pharmacy_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.prescriptionId],
			foreignColumns: [prescriptions.id],
			name: "pharmacy_orders_prescription_id_fkey"
		}).onDelete("cascade"),
]);

export const pharmacyOrderItems = pgTable("pharmacy_order_items", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	pharmacyOrderId: uuid("pharmacy_order_id").notNull(),
	prescriptionItemId: uuid("prescription_item_id").notNull(),
	medicineId: uuid("medicine_id"),
	quantityRequested: integer("quantity_requested").notNull(),
	quantityDispensed: integer("quantity_dispensed").default(0),
	status: varchar({ length: 30 }).default('pending'),
	substitutedMedicineId: uuid("substituted_medicine_id"),
}, (table) => [
	foreignKey({
			columns: [table.medicineId],
			foreignColumns: [medicines.id],
			name: "pharmacy_order_items_medicine_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.pharmacyOrderId],
			foreignColumns: [pharmacyOrders.id],
			name: "pharmacy_order_items_pharmacy_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.prescriptionItemId],
			foreignColumns: [prescriptionItems.id],
			name: "pharmacy_order_items_prescription_item_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.substitutedMedicineId],
			foreignColumns: [medicines.id],
			name: "pharmacy_order_items_substituted_medicine_id_fkey"
		}).onDelete("set null"),
]);

export const dispensingLogs = pgTable("dispensing_logs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	pharmacyOrderItemId: uuid("pharmacy_order_item_id").notNull(),
	dispensedByUserId: uuid("dispensed_by_user_id").notNull(),
	quantity: integer().notNull(),
	batchNo: varchar("batch_no", { length: 100 }),
	dispensedAt: timestamp("dispensed_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.dispensedByUserId],
			foreignColumns: [users.id],
			name: "dispensing_logs_dispensed_by_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.pharmacyOrderItemId],
			foreignColumns: [pharmacyOrderItems.id],
			name: "dispensing_logs_pharmacy_order_item_id_fkey"
		}).onDelete("cascade"),
]);

export const diagnosticOrders = pgTable("diagnostic_orders", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	consultationId: uuid("consultation_id"),
	patientId: uuid("patient_id").notNull(),
	orderingDoctorId: uuid("ordering_doctor_id").notNull(),
	status: varchar({ length: 30 }).default('requested'),
	clinicalNotes: text("clinical_notes"),
	orderedAt: timestamp("ordered_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.consultationId],
			foreignColumns: [consultations.id],
			name: "diagnostic_orders_consultation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderingDoctorId],
			foreignColumns: [doctorProfiles.id],
			name: "diagnostic_orders_ordering_doctor_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "diagnostic_orders_patient_id_fkey"
		}).onDelete("cascade"),
]);

export const diagnosticOrderItems = pgTable("diagnostic_order_items", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	diagnosticOrderId: uuid("diagnostic_order_id").notNull(),
	testName: varchar("test_name", { length: 255 }).notNull(),
	testCode: varchar("test_code", { length: 100 }),
	status: varchar({ length: 30 }).default('pending'),
}, (table) => [
	foreignKey({
			columns: [table.diagnosticOrderId],
			foreignColumns: [diagnosticOrders.id],
			name: "diagnostic_order_items_diagnostic_order_id_fkey"
		}).onDelete("cascade"),
]);

export const diagnosticReports = pgTable("diagnostic_reports", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	diagnosticOrderItemId: uuid("diagnostic_order_item_id").notNull(),
	documentId: uuid("document_id"),
	resultSummary: text("result_summary"),
	isAbnormal: boolean("is_abnormal").default(false),
	reviewedByDoctorId: uuid("reviewed_by_doctor_id"),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.diagnosticOrderItemId],
			foreignColumns: [diagnosticOrderItems.id],
			name: "diagnostic_reports_diagnostic_order_item_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "diagnostic_reports_document_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.reviewedByDoctorId],
			foreignColumns: [doctorProfiles.id],
			name: "diagnostic_reports_reviewed_by_doctor_id_fkey"
		}).onDelete("set null"),
	unique("diagnostic_reports_diagnostic_order_item_id_key").on(table.diagnosticOrderItemId),
]);

export const referrals = pgTable("referrals", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	referringDoctorId: uuid("referring_doctor_id").notNull(),
	urgency: varchar({ length: 20 }).default('routine'),
	reason: text().notNull(),
	status: varchar({ length: 30 }).default('sent'),
	resultingAppointmentId: uuid("resulting_appointment_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patientProfiles.id],
			name: "referrals_patient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.referringDoctorId],
			foreignColumns: [doctorProfiles.id],
			name: "referrals_referring_doctor_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.resultingAppointmentId],
			foreignColumns: [appointments.id],
			name: "referrals_resulting_appointment_id_fkey"
		}).onDelete("set null"),
]);

export const notifications = pgTable("notifications", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	channel: varchar({ length: 20 }).notNull(),
	payload: jsonb().default({}),
	status: varchar({ length: 20 }).default('queued'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	message: text(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey"
		}).onDelete("cascade"),
]);

export const galleryImages = pgTable("gallery_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	secureUrl: text("secure_url").notNull(),
	publicId: text("public_id").notNull(),
	originalFilename: text("original_filename").notNull(),
	imageType: text("image_type").notNull(),
	description: text(),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
});

export const patientProfiles = pgTable("patient_profiles", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	bloodGroup: varchar("blood_group", { length: 5 }),
	emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
	emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
	allergies: jsonb().default([]),
	chronicConditions: jsonb("chronic_conditions").default([]),
	abhaId: varchar("abha_id", { length: 100 }),
	address: text(),
	villageTown: varchar("village_town", { length: 100 }),
	district: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	pincode: varchar({ length: 20 }),
	name: varchar(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "patient_profiles_user_id_fkey"
		}).onDelete("cascade"),
	unique("patient_profiles_user_id_key").on(table.userId),
]);

export const users = pgTable("users", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	passwordHash: text("password_hash"),
	name: varchar({ length: 255 }).notNull(),
	dob: date(),
	gender: varchar({ length: 20 }),
	preferredLanguage: varchar("preferred_language", { length: 10 }).default('en'),
	status: varchar({ length: 50 }).default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	clerkId: varchar("clerk_id", { length: 255 }),
}, (table) => [
	unique("users_phone_key").on(table.phone),
	unique("users_email_key").on(table.email),
	unique("users_clerk_id_key").on(table.clerkId),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	actorUserId: uuid("actor_user_id"),
	action: varchar(),
	resourceType: varchar("resource_type"),
	resourceId: uuid("resource_id"),
	beforeState: jsonb("before_state"),
	afterState: jsonb("after_state"),
	ipAddress: varchar("ip_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "audit_logs_actor_user_id_fkey"
		}),
]);
