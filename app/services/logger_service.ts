

// Декоратор метода для логирования вызова
export default function logMethod(target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    // Сохраняем оригинальную функцию метода
    const originalMethod = descriptor.value;

    // Заменяем функцию метода на новую функцию, которая добавляет логирование
    descriptor.value = function(...args: any[]) {
        console.log(`Call: ${key}(${args.join(', ')})`); // Логирование вызова метода
        return originalMethod.apply(this, args); // Вызов оригинального метода
    };
    return descriptor;
}