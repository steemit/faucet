/**
 * LocalStorage wrapper that does not throw.
 * Note that access via key/index does not work, you must use the methods.
 */
export class SafeStorage implements Storage {

    [key: string]: any
    [index: number]: string

    constructor(private backingStore?: Storage) {}

    public get length() {
        return (this.backingStore) ? this.backingStore.length : 0
    }

    public key(index: number) {
        return (this.backingStore) ? this.backingStore.key(index) : null
    }

    public getItem(key: string): string | null {
        try {
            if (this.backingStore) {
                return this.backingStore.getItem(key)
            }
        } catch (error) {
            // tslint:disable-next-line
            console.warn('Unable to read item from storage', error)
        }
        return null
    }

    public setItem(key: string, data: string) {
        try {
            if (this.backingStore) {
                this.backingStore.setItem(key, data)
            }
        } catch (error) {
            // tslint:disable-next-line
            console.warn('Unable to write item to storage', error)
        }
    }

    public removeItem(key: string) {
        try {
            if (this.backingStore) {
                this.backingStore.removeItem(key)
            }
        } catch (error) {
            // tslint:disable-next-line
            console.warn('Unable to remove item from storage', error)
        }
    }

    public clear() {
        try {
            if (this.backingStore) {
                this.backingStore.clear()
            }
        } catch (error) {
            // tslint:disable-next-line
            console.warn('Unable to clear storage', error)
        }
    }

}

/** Safe localStorage instance. */
export const safeStorage = new SafeStorage(window.localStorage)
