import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'message-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

export interface SendMessageInput {
  senderId: string;
  receiverId: string;
  content: string;
}

function getUserName(user: any): string {
  if (user.doctorProfile) {
    return `Dr. ${user.doctorProfile.firstName} ${user.doctorProfile.lastName}`;
  }
  if (user.patientProfile) {
    return `${user.patientProfile.firstName} ${user.patientProfile.lastName}`;
  }
  return user.email;
}

export const getMessages = async (userId?: string, otherUserId?: string) => {
  let where = {};

  if (userId && otherUserId) {
    where = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };
  } else if (userId) {
    where = {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    };
  }

  logger.info('Fetching messages', { userId, otherUserId });

  const messages = await prisma.message.findMany({
    where,
    include: {
      sender: {
        include: { patientProfile: true, doctorProfile: true },
      },
      receiver: {
        include: { patientProfile: true, doctorProfile: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return messages.map((msg) => ({
    ...msg,
    senderName: getUserName(msg.sender),
    receiverName: getUserName(msg.receiver),
  }));
};

export const getMessageById = async (id: string) => {
  logger.info('Fetching message by ID', { id });

  const message = await prisma.message.findUnique({
    where: { id },
    include: {
      sender: { include: { patientProfile: true, doctorProfile: true } },
      receiver: { include: { patientProfile: true, doctorProfile: true } },
    },
  });

  if (!message) return null;

  return {
    ...message,
    senderName: getUserName(message.sender),
    receiverName: getUserName(message.receiver),
  };
};

export const sendMessage = async (data: SendMessageInput) => {
  const { senderId, receiverId, content } = data;

  logger.info('Sending message', { senderId, receiverId });

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    include: { patientProfile: true, doctorProfile: true },
  });
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    include: { patientProfile: true, doctorProfile: true },
  });

  const senderName = sender ? getUserName(sender) : null;
  const receiverName = receiver ? getUserName(receiver) : null;

  const message = await prisma.message.create({
    data: { senderId, receiverId, content, senderName, receiverName },
    include: {
      sender: { include: { patientProfile: true, doctorProfile: true } },
      receiver: { include: { patientProfile: true, doctorProfile: true } },
    },
  });

  return {
    ...message,
    senderName: senderName || getUserName(message.sender),
    receiverName: receiverName || getUserName(message.receiver),
  };
};

export const markMessageAsRead = async (id: string) => {
  logger.info('Marking message as read', { id });

  const message = await prisma.message.update({
    where: { id },
    data: { read: true },
  });

  return message;
};

export const deleteMessage = async (id: string) => {
  logger.info('Deleting message', { id });

  await prisma.message.delete({
    where: { id },
  });
};
