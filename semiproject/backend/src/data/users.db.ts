export interface User {
  username: string;
  password: string;
}

// 임시 DB (메모리 저장)
export const users: User[] = [];