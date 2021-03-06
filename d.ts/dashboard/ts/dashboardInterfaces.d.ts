declare module Dashboard {
    interface DashboardService {
        hasDashboard: boolean;
        inDashboard: boolean;
        getAddLink(title?: string, width?: number, height?: number): string;
    }
    interface SearchMap {
        [name: string]: string;
    }
    interface DashboardWidget {
        id: string;
        title: string;
        row?: number;
        col?: number;
        size_x?: number;
        size_y?: number;
        path?: string;
        url?: string;
        include?: string;
        search?: SearchMap;
        routeParams?: string;
    }
    interface Dashboard {
        id: string;
        title: string;
        group: string;
        widgets: Array<DashboardWidget>;
    }
    interface DefaultDashboards {
        add: (dashbard: Dashboard) => void;
        remove: (id: string) => Dashboard;
        getAll: () => Array<Dashboard>;
    }
    interface DashboardRepository {
        putDashboards: (array: any[], commitMessage: string, fn) => any;
        deleteDashboards: (array: Array<Dashboard>, fn) => any;
        getDashboards: (fn: (dashboards: Array<Dashboard>) => void) => void;
        getDashboard: (id: string, fn: (dashboard: Dashboard) => void) => any;
        createDashboard: (options: any) => any;
        cloneDashboard: (dashboard: any) => any;
        getType: () => string;
    }
}
