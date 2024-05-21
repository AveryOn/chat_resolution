
export interface UserForResponse {
    id: number;
    name: string;
    lastname: string;
    surname: string | null;
    email: string;
    password?: undefined,
    role: 'user' | 'admin';
    lastActivity: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}