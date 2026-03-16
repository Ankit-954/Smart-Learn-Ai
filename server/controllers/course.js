import { instance } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import crypto from "crypto";
import { Payment } from "../models/Payment.js";
import { Progress } from "../models/Progress.js";

const logEvent = (level, event, meta = {}) => {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  });
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
};

export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find().sort({
    isTopCourse: -1,
    topPriority: 1,
    createdAt: -1,
  });
  res.json({
    courses,
  });
});

export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  res.json({
    course,
  });
});

export const fetchLectures = TryCatch(async (req, res) => {
  const lectures = await Lecture.find({ course: req.params.id });

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lectures });
  }

  const hasSubscription = user.subscription.some(
    (courseId) => String(courseId) === String(req.params.id)
  );
  if (!hasSubscription)
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lectures });
});

export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) {
    return res.status(404).json({ message: "Lecture not found" });
  }

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lecture });
  }

  const hasSubscription = user.subscription.some(
    (courseId) => String(courseId) === String(lecture.course)
  );
  if (!hasSubscription)
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lecture });
});

export const getMyCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find({ _id: req.user.subscription });

  res.json({
    courses,
  });
});

export const enrollFreeCourse = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  const course = await Courses.findById(req.params.id);

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const isFree = course.isFree || Number(course.price) <= 0;
  if (!isFree) {
    return res.status(400).json({ message: "This course is paid. Please purchase it." });
  }

  const alreadySubscribed = user.subscription.some(
    (courseId) => String(courseId) === String(course._id)
  );

  if (!alreadySubscribed) {
    user.subscription.push(course._id);
    await user.save();
    await Progress.findOneAndUpdate(
      { course: course._id, user: req.user._id },
      { $setOnInsert: { course: course._id, completedLectures: [], user: req.user._id } },
      { upsert: true, new: true }
    );
  }

  return res.status(200).json({
    message: alreadySubscribed ? "You already have this course" : "Enrolled successfully",
    course,
  });
});

export const checkout = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);

  const course = await Courses.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const alreadySubscribed = user.subscription.some(
    (courseId) => String(courseId) === String(course._id)
  );
  if (alreadySubscribed) {
    return res.status(400).json({
      message: "You already have this course",
    });
  }

  if (course.isFree || Number(course.price) <= 0) {
    return res.status(400).json({ message: "This course is free. Please enroll instead." });
  }

  const options = {
    amount: Number(course.price * 100),
    currency: "INR",
    // Razorpay receipt has a length limit; keep it short and deterministic.
    receipt: `rcpt_${Date.now()}`,
    notes: {
      courseId: String(course._id),
      userId: String(req.user._id),
    },
  };

  let order;
  try {
    order = await instance.orders.create(options);
  } catch (err) {
    const msg =
      err?.error?.description ||
      err?.error?.reason ||
      err?.message ||
      "Razorpay order creation failed";
    return res.status(400).json({ message: msg });
  }

  res.status(201).json({
    order,
    course,
    key: process.env.Razorpay_Key,
  });
});

export const paymentVerification = TryCatch(async (req, res) => {
  const startedAt = Date.now();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Invalid payment verification payload" });
  }

  const existingPayment = await Payment.findOne({ razorpay_payment_id });
  if (existingPayment) {
    const user = await User.findById(req.user._id);
    const course = await Courses.findById(req.params.id);
    if (
      user &&
      course &&
      !user.subscription.some((courseId) => String(courseId) === String(course._id))
    ) {
      user.subscription.push(course._id);
      await user.save();
    }
    if (course) {
      await Progress.findOneAndUpdate(
        { course: course._id, user: req.user._id },
        { $setOnInsert: { course: course._id, completedLectures: [], user: req.user._id } },
        { upsert: true, new: true }
      );
    }
    logEvent("info", "payment_verification_idempotent", {
      userId: String(req.user._id),
      courseId: String(req.params.id),
      paymentId: razorpay_payment_id,
      elapsedMs: Date.now() - startedAt,
    });
    return res.status(200).json({ message: "Course Purchased Successfully" });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.Razorpay_Secret)
    .update(body)
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    await Payment.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      source: "checkout",
    });

    const user = await User.findById(req.user._id);

    const course = await Courses.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (!user.subscription.some((courseId) => String(courseId) === String(course._id))) {
      user.subscription.push(course._id);
    }

    await Progress.findOneAndUpdate(
      { course: course._id, user: req.user._id },
      { $setOnInsert: { course: course._id, completedLectures: [], user: req.user._id } },
      { upsert: true, new: true }
    );

    await user.save();
    logEvent("info", "payment_verification_success", {
      userId: String(req.user._id),
      courseId: String(course._id),
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      elapsedMs: Date.now() - startedAt,
    });

    res.status(200).json({
      message: "Course Purchased Successfully",
    });
  } else {
    logEvent("error", "payment_verification_failed_signature", {
      userId: String(req.user._id),
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      elapsedMs: Date.now() - startedAt,
    });
    return res.status(400).json({
      message: "Payment Failed",
    });
  }
});

export const razorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const secret = process.env.Razorpay_Webhook_Secret;

  if (!secret) {
    return res.status(500).json({ message: "Webhook secret not configured" });
  }
  if (!signature) {
    return res.status(400).json({ message: "Missing Razorpay signature" });
  }

  const payload = req.body?.toString("utf8") || "";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSignature !== signature) {
    logEvent("error", "payment_webhook_invalid_signature");
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch (error) {
    return res.status(400).json({ message: "Invalid webhook payload" });
  }

  if (event.event === "payment.captured") {
    const entity = event?.payload?.payment?.entity || {};
    const paymentId = entity.id;
    const orderId = entity.order_id;
    const notes = entity.notes || {};
    const userId = notes.userId;
    const courseId = notes.courseId;

    try {
      if (paymentId) {
        const existingPayment = await Payment.findOne({ razorpay_payment_id: paymentId });
        if (!existingPayment) {
          await Payment.create({
            razorpay_order_id: orderId || "",
            razorpay_payment_id: paymentId,
            razorpay_signature: "webhook",
            source: "webhook",
          });
        }
      }

      if (userId && courseId) {
        await User.findByIdAndUpdate(userId, {
          $addToSet: { subscription: courseId },
        });
        await Progress.findOneAndUpdate(
          { course: courseId, user: userId },
          { $setOnInsert: { course: courseId, completedLectures: [], user: userId } },
          { upsert: true, new: true }
        );
      }

      logEvent("info", "payment_webhook_captured_processed", {
        paymentId,
        orderId,
        userId,
        courseId,
      });
    } catch (error) {
      logEvent("error", "payment_webhook_processing_failed", {
        message: error.message,
        paymentId,
        orderId,
      });
      return res.status(500).json({ message: "Webhook processing failed" });
    }
  }

  return res.status(200).json({ received: true });
};

export const addProgress = TryCatch(async (req, res) => {
  const progress = await Progress.findOne({
    user: req.user._id,
    course: req.query.course,
  });

  const { lectureId } = req.query;

  if (progress.completedLectures.includes(lectureId)) {
    return res.json({
      message: "Progress recorded",
    });
  }

  progress.completedLectures.push(lectureId);

  await progress.save();

  res.status(201).json({
    message: "new Progress added",
  });
});

export const getYourProgress = TryCatch(async (req, res) => {
  const progress = await Progress.find({
    user: req.user._id,
    course: req.query.course,
  });

  if (!progress) return res.status(404).json({ message: "null" });

  const allLectures = (await Lecture.find({ course: req.query.course })).length;

  const completedLectures = progress[0].completedLectures.length;

  const courseProgressPercentage = (completedLectures * 100) / allLectures;

  res.json({
    courseProgressPercentage,
    completedLectures,
    allLectures,
    progress,
  });
});
