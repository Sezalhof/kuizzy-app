// src/utils/roleCheck.js

export const isAdmin = (userData) => userData?.role === 'admin';
export const isTeacher = (userData) => userData?.role === 'teacher';
export const isModerator = (userData) => userData?.role === 'moderator';
export const isStudent = (userData) => userData?.role === 'student';
