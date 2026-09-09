-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "roles_name_key" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"facility_id" uuid
);
--> statement-breakpoint
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid,
	"channel" varchar(20) NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified" boolean DEFAULT false,
	"attempt_count" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "otp_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" varchar(255),
	"refresh_token_hash" text NOT NULL,
	"ip_address" varchar(45),
	"last_active_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "doctor_availability" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"doctor_profile_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"slot_duration_minutes" integer DEFAULT 15,
	"is_teleslot" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "doctor_availability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "doctor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"specialization" varchar(100),
	"qualification" varchar(100),
	"license_no" varchar(100) NOT NULL,
	"experience_years" integer,
	"consultation_modes" varchar(100) DEFAULT 'in_person',
	"consultation_fee" numeric(10, 2) DEFAULT '0.00',
	"name" varchar,
	"user_id" uuid,
	CONSTRAINT "doctor_profiles_license_no_key" UNIQUE("license_no")
);
--> statement-breakpoint
ALTER TABLE "doctor_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pharmacist_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"pharmacy_id" uuid,
	"license_no" varchar(100) NOT NULL,
	"name" varchar,
	"user_id" uuid,
	CONSTRAINT "pharmacist_profiles_license_no_key" UNIQUE("license_no")
);
--> statement-breakpoint
ALTER TABLE "pharmacist_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "receptionist_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "receptionist_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"mode" varchar(20) DEFAULT 'in_person',
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" varchar(30) DEFAULT 'booked',
	"booked_by" varchar(30) DEFAULT 'patient',
	"booked_by_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "queue_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"token_number" integer NOT NULL,
	"queue_date" date NOT NULL,
	"status" varchar(30) DEFAULT 'waiting',
	"checked_in_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"called_at" timestamp with time zone,
	"estimated_wait_minutes" integer DEFAULT 0,
	CONSTRAINT "queue_tokens_appointment_id_key" UNIQUE("appointment_id")
);
--> statement-breakpoint
ALTER TABLE "queue_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "teleconsultation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"room_id" varchar(255) NOT NULL,
	"provider" varchar(50) DEFAULT 'webrtc',
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"recording_url" text,
	CONSTRAINT "teleconsultation_sessions_appointment_id_key" UNIQUE("appointment_id")
);
--> statement-breakpoint
ALTER TABLE "teleconsultation_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"chief_complaint" text,
	"clinical_notes" text,
	"vitals" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"ended_at" timestamp with time zone,
	"status" varchar(30) DEFAULT 'ongoing',
	CONSTRAINT "consultations_appointment_id_key" UNIQUE("appointment_id")
);
--> statement-breakpoint
ALTER TABLE "consultations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"patient_id" uuid,
	"file_type" varchar(50) NOT NULL,
	"storage_url" text NOT NULL,
	"file_size_bytes" bigint,
	"checksum" varchar(255),
	"encrypted" boolean DEFAULT false,
	"uploaded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"patient_id" uuid NOT NULL,
	"consultation_id" uuid,
	"record_type" varchar(50) NOT NULL,
	"summary" text,
	"document_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "medical_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"icd_code" varchar(50),
	"description" text NOT NULL,
	"severity" varchar(20) DEFAULT 'medium'
);
--> statement-breakpoint
ALTER TABLE "diagnoses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"recommended_date" date NOT NULL,
	"instructions" text,
	"status" varchar(30) DEFAULT 'pending',
	"resulting_appointment_id" uuid
);
--> statement-breakpoint
ALTER TABLE "follow_ups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "high_risk_alerts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"patient_id" uuid NOT NULL,
	"raised_by_doctor_id" uuid NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "high_risk_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'created',
	"digital_signature" text,
	"issued_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"valid_until" timestamp with time zone,
	CONSTRAINT "prescriptions_consultation_id_key" UNIQUE("consultation_id")
);
--> statement-breakpoint
ALTER TABLE "prescriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"generic_name" varchar(255),
	"brand" varchar(255),
	"form" varchar(50),
	"strength" varchar(50),
	"manufacturer" varchar(255),
	"category" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "medicines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"medicine_id" uuid,
	"medicine_name_freetext" varchar(255),
	"dosage" varchar(100) NOT NULL,
	"frequency" varchar(100) NOT NULL,
	"duration" varchar(100) NOT NULL,
	"instructions" text,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prescription_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pharmacies" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"license_no" varchar(100) NOT NULL,
	"accepts_teleorders" boolean DEFAULT true,
	CONSTRAINT "pharmacies_license_no_key" UNIQUE("license_no")
);
--> statement-breakpoint
ALTER TABLE "pharmacies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pharmacy_inventory" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"quantity_available" integer DEFAULT 0 NOT NULL,
	"reorder_threshold" integer DEFAULT 10,
	"expiry_date" date NOT NULL,
	"batch_no" varchar(100) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "pharmacy_inventory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pharmacy_orders" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'pending',
	"pharmacist_notes" text,
	"requested_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "pharmacy_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pharmacy_order_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"pharmacy_order_id" uuid NOT NULL,
	"prescription_item_id" uuid NOT NULL,
	"medicine_id" uuid,
	"quantity_requested" integer NOT NULL,
	"quantity_dispensed" integer DEFAULT 0,
	"status" varchar(30) DEFAULT 'pending',
	"substituted_medicine_id" uuid
);
--> statement-breakpoint
ALTER TABLE "pharmacy_order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dispensing_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"pharmacy_order_item_id" uuid NOT NULL,
	"dispensed_by_user_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"batch_no" varchar(100),
	"dispensed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "dispensing_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diagnostic_orders" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"consultation_id" uuid,
	"patient_id" uuid NOT NULL,
	"ordering_doctor_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'requested',
	"clinical_notes" text,
	"ordered_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "diagnostic_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diagnostic_order_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"diagnostic_order_id" uuid NOT NULL,
	"test_name" varchar(255) NOT NULL,
	"test_code" varchar(100),
	"status" varchar(30) DEFAULT 'pending'
);
--> statement-breakpoint
ALTER TABLE "diagnostic_order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diagnostic_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"diagnostic_order_item_id" uuid NOT NULL,
	"document_id" uuid,
	"result_summary" text,
	"is_abnormal" boolean DEFAULT false,
	"reviewed_by_doctor_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "diagnostic_reports_diagnostic_order_item_id_key" UNIQUE("diagnostic_order_item_id")
);
--> statement-breakpoint
ALTER TABLE "diagnostic_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"patient_id" uuid NOT NULL,
	"referring_doctor_id" uuid NOT NULL,
	"urgency" varchar(20) DEFAULT 'routine',
	"reason" text NOT NULL,
	"status" varchar(30) DEFAULT 'sent',
	"resulting_appointment_id" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'queued',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"read_at" timestamp with time zone,
	"message" text
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secure_url" text NOT NULL,
	"public_id" text NOT NULL,
	"original_filename" text NOT NULL,
	"image_type" text NOT NULL,
	"description" text,
	"file_size" integer,
	"mime_type" text,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"blood_group" varchar(5),
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(20),
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"chronic_conditions" jsonb DEFAULT '[]'::jsonb,
	"abha_id" varchar(100),
	"address" text,
	"village_town" varchar(100),
	"district" varchar(100),
	"state" varchar(100),
	"pincode" varchar(20),
	"name" varchar,
	CONSTRAINT "patient_profiles_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "patient_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"password_hash" text,
	"name" varchar(255) NOT NULL,
	"dob" date,
	"gender" varchar(20),
	"preferred_language" varchar(10) DEFAULT 'en',
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"clerk_id" varchar(255),
	CONSTRAINT "users_phone_key" UNIQUE("phone"),
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_clerk_id_key" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar,
	"resource_type" varchar,
	"resource_id" uuid,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip_address" varchar,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacist_profiles" ADD CONSTRAINT "fk_pharmacist_pharmacy" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacist_profiles" ADD CONSTRAINT "pharmacist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receptionist_profiles" ADD CONSTRAINT "receptionist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_booked_by_user_id_fkey" FOREIGN KEY ("booked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_tokens" ADD CONSTRAINT "queue_tokens_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teleconsultation_sessions" ADD CONSTRAINT "teleconsultation_sessions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_resulting_appointment_id_fkey" FOREIGN KEY ("resulting_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_risk_alerts" ADD CONSTRAINT "high_risk_alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_risk_alerts" ADD CONSTRAINT "high_risk_alerts_raised_by_doctor_id_fkey" FOREIGN KEY ("raised_by_doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_pharmacy_order_id_fkey" FOREIGN KEY ("pharmacy_order_id") REFERENCES "public"."pharmacy_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "public"."prescription_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_substituted_medicine_id_fkey" FOREIGN KEY ("substituted_medicine_id") REFERENCES "public"."medicines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensing_logs" ADD CONSTRAINT "dispensing_logs_dispensed_by_user_id_fkey" FOREIGN KEY ("dispensed_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensing_logs" ADD CONSTRAINT "dispensing_logs_pharmacy_order_item_id_fkey" FOREIGN KEY ("pharmacy_order_item_id") REFERENCES "public"."pharmacy_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_orders" ADD CONSTRAINT "diagnostic_orders_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_orders" ADD CONSTRAINT "diagnostic_orders_ordering_doctor_id_fkey" FOREIGN KEY ("ordering_doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_orders" ADD CONSTRAINT "diagnostic_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_order_items" ADD CONSTRAINT "diagnostic_order_items_diagnostic_order_id_fkey" FOREIGN KEY ("diagnostic_order_id") REFERENCES "public"."diagnostic_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_reports" ADD CONSTRAINT "diagnostic_reports_diagnostic_order_item_id_fkey" FOREIGN KEY ("diagnostic_order_item_id") REFERENCES "public"."diagnostic_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_reports" ADD CONSTRAINT "diagnostic_reports_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_reports" ADD CONSTRAINT "diagnostic_reports_reviewed_by_doctor_id_fkey" FOREIGN KEY ("reviewed_by_doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referring_doctor_id_fkey" FOREIGN KEY ("referring_doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_resulting_appointment_id_fkey" FOREIGN KEY ("resulting_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
*/