import { relations } from "drizzle-orm/relations";
import { roles, userRoles, users, otpVerifications, authSessions, doctorProfiles, doctorAvailability, pharmacies, pharmacistProfiles, receptionistProfiles, appointments, patientProfiles, queueTokens, teleconsultationSessions, consultations, documents, medicalRecords, diagnoses, followUps, highRiskAlerts, prescriptions, medicines, prescriptionItems, pharmacyInventory, pharmacyOrders, pharmacyOrderItems, dispensingLogs, diagnosticOrders, diagnosticOrderItems, diagnosticReports, referrals, notifications, auditLogs } from "./schema";

export const userRolesRelations = relations(userRoles, ({one}) => ({
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
}));

export const usersRelations = relations(users, ({many}) => ({
	userRoles: many(userRoles),
	otpVerifications: many(otpVerifications),
	authSessions: many(authSessions),
	doctorProfiles: many(doctorProfiles),
	pharmacistProfiles: many(pharmacistProfiles),
	receptionistProfiles: many(receptionistProfiles),
	appointments: many(appointments),
	documents: many(documents),
	medicalRecords: many(medicalRecords),
	dispensingLogs: many(dispensingLogs),
	notifications: many(notifications),
	patientProfiles: many(patientProfiles),
	auditLogs: many(auditLogs),
}));

export const otpVerificationsRelations = relations(otpVerifications, ({one}) => ({
	user: one(users, {
		fields: [otpVerifications.userId],
		references: [users.id]
	}),
}));

export const authSessionsRelations = relations(authSessions, ({one}) => ({
	user: one(users, {
		fields: [authSessions.userId],
		references: [users.id]
	}),
}));

export const doctorAvailabilityRelations = relations(doctorAvailability, ({one}) => ({
	doctorProfile: one(doctorProfiles, {
		fields: [doctorAvailability.doctorProfileId],
		references: [doctorProfiles.id]
	}),
}));

export const doctorProfilesRelations = relations(doctorProfiles, ({one, many}) => ({
	doctorAvailabilities: many(doctorAvailability),
	user: one(users, {
		fields: [doctorProfiles.userId],
		references: [users.id]
	}),
	appointments: many(appointments),
	consultations: many(consultations),
	followUps: many(followUps),
	highRiskAlerts: many(highRiskAlerts),
	prescriptions: many(prescriptions),
	diagnosticOrders: many(diagnosticOrders),
	diagnosticReports: many(diagnosticReports),
	referrals: many(referrals),
}));

export const pharmacistProfilesRelations = relations(pharmacistProfiles, ({one}) => ({
	pharmacy: one(pharmacies, {
		fields: [pharmacistProfiles.pharmacyId],
		references: [pharmacies.id]
	}),
	user: one(users, {
		fields: [pharmacistProfiles.userId],
		references: [users.id]
	}),
}));

export const pharmaciesRelations = relations(pharmacies, ({many}) => ({
	pharmacistProfiles: many(pharmacistProfiles),
	pharmacyInventories: many(pharmacyInventory),
	pharmacyOrders: many(pharmacyOrders),
}));

export const receptionistProfilesRelations = relations(receptionistProfiles, ({one}) => ({
	user: one(users, {
		fields: [receptionistProfiles.userId],
		references: [users.id]
	}),
}));

export const appointmentsRelations = relations(appointments, ({one, many}) => ({
	user: one(users, {
		fields: [appointments.bookedByUserId],
		references: [users.id]
	}),
	doctorProfile: one(doctorProfiles, {
		fields: [appointments.doctorId],
		references: [doctorProfiles.id]
	}),
	patientProfile: one(patientProfiles, {
		fields: [appointments.patientId],
		references: [patientProfiles.id]
	}),
	queueTokens: many(queueTokens),
	teleconsultationSessions: many(teleconsultationSessions),
	consultations: many(consultations),
	followUps: many(followUps),
	referrals: many(referrals),
}));

export const patientProfilesRelations = relations(patientProfiles, ({one, many}) => ({
	appointments: many(appointments),
	consultations: many(consultations),
	documents: many(documents),
	medicalRecords: many(medicalRecords),
	followUps: many(followUps),
	highRiskAlerts: many(highRiskAlerts),
	prescriptions: many(prescriptions),
	pharmacyOrders: many(pharmacyOrders),
	diagnosticOrders: many(diagnosticOrders),
	referrals: many(referrals),
	user: one(users, {
		fields: [patientProfiles.userId],
		references: [users.id]
	}),
}));

export const queueTokensRelations = relations(queueTokens, ({one}) => ({
	appointment: one(appointments, {
		fields: [queueTokens.appointmentId],
		references: [appointments.id]
	}),
}));

export const teleconsultationSessionsRelations = relations(teleconsultationSessions, ({one}) => ({
	appointment: one(appointments, {
		fields: [teleconsultationSessions.appointmentId],
		references: [appointments.id]
	}),
}));

export const consultationsRelations = relations(consultations, ({one, many}) => ({
	appointment: one(appointments, {
		fields: [consultations.appointmentId],
		references: [appointments.id]
	}),
	doctorProfile: one(doctorProfiles, {
		fields: [consultations.doctorId],
		references: [doctorProfiles.id]
	}),
	patientProfile: one(patientProfiles, {
		fields: [consultations.patientId],
		references: [patientProfiles.id]
	}),
	medicalRecords: many(medicalRecords),
	diagnoses: many(diagnoses),
	followUps: many(followUps),
	prescriptions: many(prescriptions),
	diagnosticOrders: many(diagnosticOrders),
}));

export const documentsRelations = relations(documents, ({one, many}) => ({
	patientProfile: one(patientProfiles, {
		fields: [documents.patientId],
		references: [patientProfiles.id]
	}),
	user: one(users, {
		fields: [documents.uploadedByUserId],
		references: [users.id]
	}),
	medicalRecords: many(medicalRecords),
	diagnosticReports: many(diagnosticReports),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({one}) => ({
	consultation: one(consultations, {
		fields: [medicalRecords.consultationId],
		references: [consultations.id]
	}),
	user: one(users, {
		fields: [medicalRecords.createdByUserId],
		references: [users.id]
	}),
	document: one(documents, {
		fields: [medicalRecords.documentId],
		references: [documents.id]
	}),
	patientProfile: one(patientProfiles, {
		fields: [medicalRecords.patientId],
		references: [patientProfiles.id]
	}),
}));

export const diagnosesRelations = relations(diagnoses, ({one}) => ({
	consultation: one(consultations, {
		fields: [diagnoses.consultationId],
		references: [consultations.id]
	}),
}));

export const followUpsRelations = relations(followUps, ({one}) => ({
	consultation: one(consultations, {
		fields: [followUps.consultationId],
		references: [consultations.id]
	}),
	doctorProfile: one(doctorProfiles, {
		fields: [followUps.doctorId],
		references: [doctorProfiles.id]
	}),
	patientProfile: one(patientProfiles, {
		fields: [followUps.patientId],
		references: [patientProfiles.id]
	}),
	appointment: one(appointments, {
		fields: [followUps.resultingAppointmentId],
		references: [appointments.id]
	}),
}));

export const highRiskAlertsRelations = relations(highRiskAlerts, ({one}) => ({
	patientProfile: one(patientProfiles, {
		fields: [highRiskAlerts.patientId],
		references: [patientProfiles.id]
	}),
	doctorProfile: one(doctorProfiles, {
		fields: [highRiskAlerts.raisedByDoctorId],
		references: [doctorProfiles.id]
	}),
}));

export const prescriptionsRelations = relations(prescriptions, ({one, many}) => ({
	consultation: one(consultations, {
		fields: [prescriptions.consultationId],
		references: [consultations.id]
	}),
	doctorProfile: one(doctorProfiles, {
		fields: [prescriptions.doctorId],
		references: [doctorProfiles.id]
	}),
	patientProfile: one(patientProfiles, {
		fields: [prescriptions.patientId],
		references: [patientProfiles.id]
	}),
	prescriptionItems: many(prescriptionItems),
	pharmacyOrders: many(pharmacyOrders),
}));

export const prescriptionItemsRelations = relations(prescriptionItems, ({one, many}) => ({
	medicine: one(medicines, {
		fields: [prescriptionItems.medicineId],
		references: [medicines.id]
	}),
	prescription: one(prescriptions, {
		fields: [prescriptionItems.prescriptionId],
		references: [prescriptions.id]
	}),
	pharmacyOrderItems: many(pharmacyOrderItems),
}));

export const medicinesRelations = relations(medicines, ({many}) => ({
	prescriptionItems: many(prescriptionItems),
	pharmacyInventories: many(pharmacyInventory),
	pharmacyOrderItems_medicineId: many(pharmacyOrderItems, {
		relationName: "pharmacyOrderItems_medicineId_medicines_id"
	}),
	pharmacyOrderItems_substitutedMedicineId: many(pharmacyOrderItems, {
		relationName: "pharmacyOrderItems_substitutedMedicineId_medicines_id"
	}),
}));

export const pharmacyInventoryRelations = relations(pharmacyInventory, ({one}) => ({
	medicine: one(medicines, {
		fields: [pharmacyInventory.medicineId],
		references: [medicines.id]
	}),
	pharmacy: one(pharmacies, {
		fields: [pharmacyInventory.pharmacyId],
		references: [pharmacies.id]
	}),
}));

export const pharmacyOrdersRelations = relations(pharmacyOrders, ({one, many}) => ({
	patientProfile: one(patientProfiles, {
		fields: [pharmacyOrders.patientId],
		references: [patientProfiles.id]
	}),
	pharmacy: one(pharmacies, {
		fields: [pharmacyOrders.pharmacyId],
		references: [pharmacies.id]
	}),
	prescription: one(prescriptions, {
		fields: [pharmacyOrders.prescriptionId],
		references: [prescriptions.id]
	}),
	pharmacyOrderItems: many(pharmacyOrderItems),
}));

export const pharmacyOrderItemsRelations = relations(pharmacyOrderItems, ({one, many}) => ({
	medicine_medicineId: one(medicines, {
		fields: [pharmacyOrderItems.medicineId],
		references: [medicines.id],
		relationName: "pharmacyOrderItems_medicineId_medicines_id"
	}),
	pharmacyOrder: one(pharmacyOrders, {
		fields: [pharmacyOrderItems.pharmacyOrderId],
		references: [pharmacyOrders.id]
	}),
	prescriptionItem: one(prescriptionItems, {
		fields: [pharmacyOrderItems.prescriptionItemId],
		references: [prescriptionItems.id]
	}),
	medicine_substitutedMedicineId: one(medicines, {
		fields: [pharmacyOrderItems.substitutedMedicineId],
		references: [medicines.id],
		relationName: "pharmacyOrderItems_substitutedMedicineId_medicines_id"
	}),
	dispensingLogs: many(dispensingLogs),
}));

export const dispensingLogsRelations = relations(dispensingLogs, ({one}) => ({
	user: one(users, {
		fields: [dispensingLogs.dispensedByUserId],
		references: [users.id]
	}),
	pharmacyOrderItem: one(pharmacyOrderItems, {
		fields: [dispensingLogs.pharmacyOrderItemId],
		references: [pharmacyOrderItems.id]
	}),
}));

export const diagnosticOrdersRelations = relations(diagnosticOrders, ({one, many}) => ({
	consultation: one(consultations, {
		fields: [diagnosticOrders.consultationId],
		references: [consultations.id]
	}),
	doctorProfile: one(doctorProfiles, {
		fields: [diagnosticOrders.orderingDoctorId],
		references: [doctorProfiles.id]
	}),
	patientProfile: one(patientProfiles, {
		fields: [diagnosticOrders.patientId],
		references: [patientProfiles.id]
	}),
	diagnosticOrderItems: many(diagnosticOrderItems),
}));

export const diagnosticOrderItemsRelations = relations(diagnosticOrderItems, ({one, many}) => ({
	diagnosticOrder: one(diagnosticOrders, {
		fields: [diagnosticOrderItems.diagnosticOrderId],
		references: [diagnosticOrders.id]
	}),
	diagnosticReports: many(diagnosticReports),
}));

export const diagnosticReportsRelations = relations(diagnosticReports, ({one}) => ({
	diagnosticOrderItem: one(diagnosticOrderItems, {
		fields: [diagnosticReports.diagnosticOrderItemId],
		references: [diagnosticOrderItems.id]
	}),
	document: one(documents, {
		fields: [diagnosticReports.documentId],
		references: [documents.id]
	}),
	doctorProfile: one(doctorProfiles, {
		fields: [diagnosticReports.reviewedByDoctorId],
		references: [doctorProfiles.id]
	}),
}));

export const referralsRelations = relations(referrals, ({one}) => ({
	patientProfile: one(patientProfiles, {
		fields: [referrals.patientId],
		references: [patientProfiles.id]
	}),
	doctorProfile: one(doctorProfiles, {
		fields: [referrals.referringDoctorId],
		references: [doctorProfiles.id]
	}),
	appointment: one(appointments, {
		fields: [referrals.resultingAppointmentId],
		references: [appointments.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.actorUserId],
		references: [users.id]
	}),
}));