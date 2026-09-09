import { eq, and } from "drizzle-orm";
import db from "../config/db.js";

import {
  appointments,
  patientProfiles,
  doctorProfiles,
} from "../../drizzle/schema.js";

// POST /api/appointments
export const bookAppointment = async (req, res, next) => {
  try {
    const { doctorId, mode, scheduledAt, reason } = req.body;

    const userId = req.user.id;

    // Find patient's profile
    const [patient] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    // Check doctor exists
    const [doctor] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, doctorId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Create appointment
    const [appointment] = await db
      .insert(appointments)
      .values({
        patientId: patient.id,
        doctorId,
        mode,
        scheduledAt,
        reason,
        bookedBy: "patient",
        bookedByUserId: userId,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/appointments/my
export const getMyAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [patient] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const result = await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patient.id));

    res.status(200).json({
      success: true,
      appointments: result,
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/appointments/:id
export const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [patient] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.patientId, patient.id)
        )
      )
      .limit(1);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    next(error);
  }
};


// PATCH /api/appointments/:id/cancel
export const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [patient] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.patientId, patient.id)
        )
      )
      .limit(1);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const [updatedAppointment] = await db
      .update(appointments)
      .set({
        status: "cancelled",
      })
      .where(eq(appointments.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/appointments/doctor
export const getDoctorAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [doctor] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const result = await db
      .select()
      .from(appointments)
      .where(eq(appointments.doctorId, doctor.id));

    res.status(200).json({
      success: true,
      appointments: result,
    });
  } catch (error) {
    next(error);
  }
};


// PATCH /api/appointments/:id/status
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const userId = req.user.id;

    const [doctor] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.doctorId, doctor.id)
        )
      )
      .limit(1);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const [updatedAppointment] = await db
      .update(appointments)
      .set({
        status,
      })
      .where(eq(appointments.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: "Appointment status updated successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    next(error);
  }
};