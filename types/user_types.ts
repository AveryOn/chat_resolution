import User from "#models/user";
import { AccessToken } from "@adonisjs/auth/access_tokens";


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

export interface UsersPaginator {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number| null;
    firstPage: number | null;
    hasPrev: boolean;
    hasNext: boolean;
}

export type UserAndToken = User & {currentAccessToken: AccessToken}; 