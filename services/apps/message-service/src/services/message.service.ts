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

  return messages;
};

export const getMessageById = async (id: string) => {
  logger.info('Fetching message by ID', { id });

  const message = await prisma.message.findUnique({
    where: { id },
  });

  return message;
};

export const sendMessage = async (data: SendMessageInput) => {
  const { senderId, receiverId, content } = data;

  logger.info('Sending message', { senderId, receiverId });

  const message = await prisma.message.create({
    data: { senderId, receiverId, content },
  });

  return message;
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
