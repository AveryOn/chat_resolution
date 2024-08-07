import User from "#models/user";
import Message from "#models/message";
import { UsersPaginator } from "#types/user_types";
import { MessagesPaginator } from "#types/message_types";
import Chat from "#models/chat";

export async function initUserPaginator(page: number | string, perPage: number | string): Promise<UsersPaginator> {
    let paginator;
    let total;
    let currentPage;
    let limit;
    let hasNext;
    let hasPrev;
    let lastPage: number | null;
    let firstPage: number | null;

    // Вычисление значений для пагинатора
    try {
        const totalCount = await User.query().count('* as total');
        total = totalCount[0].$extras.total;
        if(total) total = +total;
    } catch (err) {
        console.error(`utils/meta_utils: initUserPaginator [totalCount]  => ${err}`);
    }

    // Вычисление значений для пагинатора
    currentPage = +page;
    limit = +perPage;
    hasNext = false;
    hasPrev = false;
    lastPage = Math.ceil(total / limit);
    firstPage = 1;
    if (currentPage == lastPage) {
        lastPage = null;
    }
    if (currentPage == firstPage) {
        firstPage = null;
    }
    if (firstPage && currentPage > firstPage) hasPrev = true;
    if (lastPage && currentPage < lastPage) hasNext = true;

    paginator = {
        total,
        perPage: limit,
        currentPage,
        lastPage,
        firstPage,
        hasPrev,
        hasNext,
    }
    return paginator;
}

export async function initMessagesPaginator(chatId: number, page: number | string, perPage: number | string): Promise<MessagesPaginator> {
    let paginator;
    let total;
    let currentPage;
    let limit;
    let hasNext;
    let hasPrev;
    let lastPage: number | null;
    let firstPage: number | null;

    // Вычисление значений для пагинатора
    try {
        const totalCount = await Message
            .query()
            .where('chat_id', chatId)
            .andWhereNull('deleted_at')
            .count('* as total');
        total = totalCount[0].$extras.total;
        
        if(total) total = +total;
    } catch (err) {
        console.error(`utils/meta_utils: initMessagesPaginator [totalCount]  => ${err}`);
    }

    // Вычисление значений для пагинатора
    currentPage = +page;
    limit = +perPage;
    hasNext = false;
    hasPrev = false;
    lastPage = Math.ceil(total / limit);
    firstPage = 1;
    if (currentPage == lastPage) {
        lastPage = null;
    }
    if (currentPage == firstPage) {
        firstPage = null;
    }
    if (firstPage && currentPage > firstPage) hasPrev = true;
    if (lastPage && currentPage < lastPage) hasNext = true;

    paginator = {
        total,
        perPage: limit,
        currentPage,
        lastPage,
        firstPage,
        hasPrev,
        hasNext,
    }
    return paginator;
}

export async function initChatsPaginator(page: number | string, perPage: number | string): Promise<MessagesPaginator> {
    let paginator;
    let total;
    let currentPage;
    let limit;
    let hasNext;
    let hasPrev;
    let lastPage: number | null;
    let firstPage: number | null;

    // Вычисление значений для пагинатора
    try {
        const totalCount = await Chat.query().count('* as total');
        total = totalCount[0].$extras.total;
        if(total) total = +total;
    } catch (err) {
        console.error(`utils/meta_utils: initChatsPaginator [totalCount]  => ${err}`);
    }

    // Вычисление значений для пагинатора
    currentPage = +page;
    limit = +perPage;
    hasNext = false;
    hasPrev = false;
    lastPage = Math.ceil(total / limit);
    firstPage = 1;
    if (currentPage == lastPage) {
        lastPage = null;
    }
    if (currentPage == firstPage) {
        firstPage = null;
    }
    if (firstPage && currentPage > firstPage) hasPrev = true;
    if (lastPage && currentPage < lastPage) hasNext = true;

    paginator = {
        total,
        perPage: limit,
        currentPage,
        lastPage,
        firstPage,
        hasPrev,
        hasNext,
    }
    return paginator;
}