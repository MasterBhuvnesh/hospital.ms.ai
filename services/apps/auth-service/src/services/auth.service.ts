import crypto from 'crypto';
import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'auth-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(userId: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ userId, role, exp: Date.now() + 86400000 })).toString('base64');
  const signature = crypto.randomBytes(16).toString('hex');
  return `${header}.${payload}.${signature}`;
}

export interface RegisterInput {
  email: string;
  password: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  firstName: string;
  lastName: string;
  specialization?: string;
  licenseNumber?: string;
  dob?: string;
  gender?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const { email, password, role, firstName, lastName, specialization, licenseNumber, dob, gender, phone } = input;

  logger.info('Registering new user', { email, role });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    logger.warn('Registration failed - email already exists', { email });
    throw new Error('User with this email already exists');
  }

  const hashedPassword = hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    if (role === 'DOCTOR') {
      await tx.doctorProfile.create({
        data: {
          userId: newUser.id,
          firstName,
          lastName,
          specialization: specialization || 'General',
          licenseNumber: licenseNumber || '',
          phone: phone || null,
        },
      });
    } else if (role === 'PATIENT') {
      await tx.patientProfile.create({
        data: {
          userId: newUser.id,
          firstName,
          lastName,
          dob: dob ? new Date(dob) : new Date(),
          gender: gender || 'Unknown',
          phone: phone || null,
        },
      });
    }

    return newUser;
  });

  const token = generateToken(user.id, user.role);

  logger.info('User registered successfully', { userId: user.id, role: user.role });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  };
}

export async function loginUser(input: LoginInput) {
  const { email, password } = input;

  logger.info('Login attempt', { email });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.warn('Login failed - user not found', { email });
    throw new Error('Invalid email or password');
  }

  const hashedPassword = hashPassword(password);
  if (user.password !== hashedPassword) {
    logger.warn('Login failed - invalid password', { email });
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user.id, user.role);

  logger.info('User logged in successfully', { userId: user.id, role: user.role });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  };
}

export async function getAllUsers() {
  logger.info('Fetching all users');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info('Users fetched', { count: users.length });

  return users;
}

export async function getUserById(id: string) {
  logger.info('Fetching user by ID', { id });

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      patientProfile: true,
      doctorProfile: true,
    },
  });

  if (!user) {
    logger.warn('User not found', { id });
    throw new Error('User not found');
  }

  logger.info('User fetched successfully', { id, role: user.role });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    patientProfile: user.patientProfile,
    doctorProfile: user.doctorProfile,
  };
}
