import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class SidebarService {
    private _isCollapsed = signal<boolean>(false);

    get isCollapsed() {
        return this._isCollapsed();
    }

    setCollapsed(value: boolean) {
        this._isCollapsed.set(value);
    }

    toggleCollapsed() {
        this._isCollapsed.set(!this._isCollapsed());
    }
}
