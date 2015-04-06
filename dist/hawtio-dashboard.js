/// Copyright 2014-2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///   http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.




var Dashboard;
(function (Dashboard) {
    Dashboard.log = Logger.get('Dashboard');
    function cleanDashboardData(item) {
        var cleanItem = {};
        angular.forEach(item, function (value, key) {
            if (!angular.isString(key) || (!key.startsWith("$") && !key.startsWith("_"))) {
                cleanItem[key] = value;
            }
        });
        return cleanItem;
    }
    Dashboard.cleanDashboardData = cleanDashboardData;
    function decodeURIComponentProperties(hash) {
        if (!hash) {
            return hash;
        }
        var decodeHash = {};
        angular.forEach(hash, function (value, key) {
            decodeHash[key] = value ? decodeURIComponent(value) : value;
        });
        return decodeHash;
    }
    Dashboard.decodeURIComponentProperties = decodeURIComponentProperties;
    function onOperationComplete(result) {
        console.log("Completed adding the dashboard with response " + JSON.stringify(result));
    }
    Dashboard.onOperationComplete = onOperationComplete;
})(Dashboard || (Dashboard = {}));

var Dashboard;
(function (Dashboard) {
    Dashboard.templatePath = 'plugins/dashboard/html/';
    Dashboard.pluginName = 'dashboard';
    Dashboard._module = angular.module(Dashboard.pluginName, []);
    Dashboard._module.config(["$routeProvider", "$provide", function ($routeProvider, $provide) {
        $provide.decorator('HawtioDashboard', ['$delegate', function ($delegate) {
            $delegate['hasDashboard'] = true;
            $delegate['getAddLink'] = function (title, size_x, size_y) {
                var target = new URI('/dashboard/add');
                var currentUri = new URI();
                var widgetUri = new URI(currentUri.path());
                widgetUri.query(currentUri.query(true));
                target.query(function (query) {
                    query.href = widgetUri.toString().escapeURL();
                    if (title) {
                        query.title = title.escapeURL();
                    }
                    if (size_x && size_y) {
                        query.size = angular.toJson({ size_x: size_x, size_y: size_y }).escapeURL();
                    }
                });
                return target.toString();
            };
            return $delegate;
        }]);
        $routeProvider.when('/dashboard/add', { templateUrl: Dashboard.templatePath + 'addToDashboard.html' }).when('/dashboard/edit', { templateUrl: Dashboard.templatePath + 'editDashboards.html' }).when('/dashboard/idx/:dashboardIndex', { templateUrl: Dashboard.templatePath + 'dashboard.html', reloadOnSearch: false }).when('/dashboard/id/:dashboardId', { templateUrl: Dashboard.templatePath + 'dashboard.html', reloadOnSearch: false }).when('/dashboard/id/:dashboardId/share', { templateUrl: Dashboard.templatePath + 'share.html' }).when('/dashboard/import', { templateUrl: Dashboard.templatePath + 'import.html' });
    }]);
    Dashboard._module.value('ui.config', {
        jq: {
            gridster: {
                widget_margins: [10, 10],
                widget_base_dimensions: [140, 140]
            }
        }
    });
    var tab = undefined;
    function setSubTabs(builder, dashboards, $rootScope) {
        Dashboard.log.debug("Updating sub-tabs");
        if (!tab.tabs) {
            tab.tabs = [];
        }
        else {
            tab.tabs.length = 0;
        }
        _.forEach(dashboards, function (dashboard) {
            var child = builder.id('dashboard-' + dashboard.id).title(function () { return dashboard.title || dashboard.id; }).href(function () {
                var uri = new URI(UrlHelpers.join('/dashboard/id', dashboard.id));
                uri.search({
                    'main-tab': Dashboard.pluginName,
                    'sub-tab': 'dashboard-' + dashboard.id
                });
                return uri.toString();
            }).build();
            tab.tabs.push(child);
        });
        var manage = builder.id('dashboard-manage').title(function () { return '<i class="fa fa-pencil"></i>&nbsp;Manage'; }).href(function () { return '/dashboard/edit?main-tab=dashboard&sub-tab=dashboard-manage'; }).build();
        tab.tabs.push(manage);
        tab.tabs.forEach(function (tab) {
            tab.isSelected = function () {
                var id = tab.id.replace('dashboard-', '');
                var uri = new URI();
                return uri.query(true)['sub-tab'] === tab.id || _.endsWith(uri.path(), id);
            };
        });
        Core.$apply($rootScope);
    }
    Dashboard.setSubTabs = setSubTabs;
    Dashboard._module.run(["HawtioNav", "dashboardRepository", "$rootScope", "HawtioDashboard", "$timeout", function (nav, dashboards, $rootScope, dash, $timeout) {
        if (!dash.inDashboard) {
            var builder = nav.builder();
            tab = builder.id(Dashboard.pluginName).href(function () { return '/dashboard/idx/0'; }).title(function () { return 'Dashboard'; }).build();
            nav.add(tab);
            $timeout(function () {
                dashboards.getDashboards(function (dashboards) {
                    setSubTabs(builder, dashboards, $rootScope);
                });
            }, 500);
        }
    }]);
    hawtioPluginLoader.addModule(Dashboard.pluginName);
})(Dashboard || (Dashboard = {}));

var Dashboard;
(function (Dashboard) {
    Dashboard._module.factory('dashboardRepository', ['DefaultDashboards', function (defaults) {
        return new LocalDashboardRepository(defaults);
    }]);
    Dashboard._module.factory('DefaultDashboards', [function () {
        var defaults = [];
        var answer = {
            add: function (dashboard) {
                defaults.push(dashboard);
            },
            remove: function (id) {
                return _.remove(defaults, function (dashboard) { return dashboard.id === id; });
            },
            getAll: function () { return defaults; }
        };
        return answer;
    }]);
    var LocalDashboardRepository = (function () {
        function LocalDashboardRepository(defaults) {
            this.defaults = defaults;
            this.localStorage = null;
            this.localStorage = Core.getLocalStorage();
        }
        LocalDashboardRepository.prototype.loadDashboards = function () {
            var answer = angular.fromJson(localStorage['userDashboards']);
            if (!answer || answer.length === 0) {
                answer = this.defaults.getAll();
            }
            Dashboard.log.debug("returning dashboards: ", answer);
            return answer;
        };
        LocalDashboardRepository.prototype.storeDashboards = function (dashboards) {
            Dashboard.log.debug("storing dashboards: ", dashboards);
            localStorage['userDashboards'] = angular.toJson(dashboards);
            return this.loadDashboards();
        };
        LocalDashboardRepository.prototype.putDashboards = function (array, commitMessage, fn) {
            var dashboards = this.loadDashboards();
            array.forEach(function (dash) {
                var existing = dashboards.findIndex(function (d) {
                    return d.id === dash.id;
                });
                if (existing >= 0) {
                    dashboards[existing] = dash;
                }
                else {
                    dashboards.push(dash);
                }
            });
            fn(this.storeDashboards(dashboards));
        };
        LocalDashboardRepository.prototype.deleteDashboards = function (array, fn) {
            var dashboards = this.loadDashboards();
            angular.forEach(array, function (item) {
                dashboards.remove(function (i) {
                    return i.id === item.id;
                });
            });
            fn(this.storeDashboards(dashboards));
        };
        LocalDashboardRepository.prototype.getDashboards = function (fn) {
            fn(this.loadDashboards());
        };
        LocalDashboardRepository.prototype.getDashboard = function (id, fn) {
            var dashboards = this.loadDashboards();
            var dashboard = dashboards.find(function (dashboard) {
                return dashboard.id === id;
            });
            fn(dashboard);
        };
        LocalDashboardRepository.prototype.createDashboard = function (options) {
            var answer = {
                title: "New Dashboard",
                group: "Personal",
                widgets: []
            };
            answer = angular.extend(answer, options);
            answer['id'] = Core.getUUID();
            return answer;
        };
        LocalDashboardRepository.prototype.cloneDashboard = function (dashboard) {
            var newDashboard = Object.clone(dashboard);
            newDashboard['id'] = Core.getUUID();
            newDashboard['title'] = "Copy of " + dashboard.title;
            return newDashboard;
        };
        LocalDashboardRepository.prototype.getType = function () {
            return 'container';
        };
        return LocalDashboardRepository;
    })();
    Dashboard.LocalDashboardRepository = LocalDashboardRepository;
})(Dashboard || (Dashboard = {}));

var Dashboard;
(function (Dashboard) {
    Dashboard._module.controller("Dashboard.EditDashboardsController", ["$scope", "$routeParams", "$route", "$location", "$rootScope", "dashboardRepository", "HawtioNav", "$timeout", "$templateCache", "$modal", function ($scope, $routeParams, $route, $location, $rootScope, dashboardRepository, nav, $timeout, $templateCache, $modal) {
        $scope._dashboards = [];
        $rootScope.$on('dashboardsUpdated', dashboardLoaded);
        $scope.hasUrl = function () {
            return ($scope.url) ? true : false;
        };
        $scope.hasSelection = function () {
            return $scope.gridOptions.selectedItems.length !== 0;
        };
        $scope.gridOptions = {
            selectedItems: [],
            showFilter: false,
            showColumnMenu: false,
            filterOptions: {
                filterText: ''
            },
            data: '_dashboards',
            selectWithCheckboxOnly: true,
            showSelectionCheckbox: true,
            columnDefs: [
                {
                    field: 'title',
                    displayName: 'Dashboard',
                    cellTemplate: $templateCache.get(UrlHelpers.join(Dashboard.templatePath, 'editDashboardTitleCell.html'))
                },
                {
                    field: 'group',
                    displayName: 'Group'
                }
            ],
        };
        var doUpdate = _.debounce(updateData, 10);
        $timeout(doUpdate, 10);
        $scope.$on("$routeChangeSuccess", function (event, current, previous) {
            $timeout(doUpdate, 10);
        });
        $scope.addViewToDashboard = function () {
            var nextHref = null;
            var selected = $scope.gridOptions.selectedItems;
            var currentUrl = new URI();
            var config = currentUrl.query(true);
            var href = config['href'];
            var iframe = config['iframe'];
            var type = 'href';
            if (href) {
                href = href.unescapeURL();
                href = Core.trimLeading(href, '#');
            }
            else if (iframe) {
                iframe = iframe.unescapeURL();
                type = 'iframe';
            }
            var widgetURI = undefined;
            switch (type) {
                case 'href':
                    Dashboard.log.debug("href: ", href);
                    widgetURI = new URI(href);
                    break;
                case 'iframe':
                    Dashboard.log.debug("iframe: ", iframe);
                    widgetURI = new URI(iframe);
                    break;
                default:
                    Dashboard.log.debug("type unknown");
                    return;
            }
            var sizeStr = config['size'];
            if (sizeStr) {
                sizeStr = sizeStr.unescapeURL();
            }
            var size = angular.fromJson(sizeStr) || { size_x: 1, size_y: 1 };
            var title = (config['title'] || '').unescapeURL();
            var templateWidget = {
                id: undefined,
                row: 1,
                col: 1,
                size_x: size.size_x,
                size_y: size.size_y,
                title: title
            };
            angular.forEach(selected, function (selectedItem) {
                var widget = _.cloneDeep(templateWidget);
                if (!selectedItem.widgets) {
                    selectedItem.widgets = [];
                }
                var nextNumber = selectedItem.widgets.length + 1;
                widget.id = 'w' + nextNumber;
                Dashboard.log.debug("widgetURI: ", widgetURI.toString());
                switch (type) {
                    case 'iframe':
                        widget = _.extend({
                            iframe: iframe
                        }, widget);
                        break;
                    case 'href':
                        var text = widgetURI.path();
                        var search = widgetURI.query(true);
                        if ($route && $route.routes) {
                            var value = $route.routes[text];
                            if (value) {
                                var templateUrl = value["templateUrl"];
                                if (templateUrl) {
                                    widget = _.extend({
                                        path: text,
                                        include: templateUrl,
                                        search: search,
                                        hash: ""
                                    }, widget);
                                }
                            }
                            else {
                                return;
                            }
                        }
                        break;
                }
                var gridWidth = 0;
                selectedItem.widgets.forEach(function (w) {
                    var rightSide = w.col + w.size_x;
                    if (rightSide > gridWidth) {
                        gridWidth = rightSide;
                    }
                });
                var found = false;
                var left = function (w) {
                    return w.col;
                };
                var right = function (w) {
                    return w.col + w.size_x - 1;
                };
                var top = function (w) {
                    return w.row;
                };
                var bottom = function (w) {
                    return w.row + w.size_y - 1;
                };
                var collision = function (w1, w2) {
                    return !(left(w2) > right(w1) || right(w2) < left(w1) || top(w2) > bottom(w1) || bottom(w2) < top(w1));
                };
                if (selectedItem.widgets.isEmpty()) {
                    found = true;
                }
                while (!found) {
                    widget.col = 1;
                    if (widget.col + widget.size_x > gridWidth) {
                        selectedItem.widgets.forEach(function (w, idx) {
                            if (widget.row <= w.row) {
                                widget.row++;
                            }
                        });
                        found = true;
                    }
                    for (; (widget.col + widget.size_x) <= gridWidth; widget.col++) {
                        if (!selectedItem.widgets.any(function (w) {
                            var c = collision(w, widget);
                            return c;
                        })) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        widget.row = widget.row + 1;
                    }
                    if (widget.row > 50) {
                        found = true;
                    }
                }
                if ($scope.routeParams) {
                    widget['routeParams'] = $scope.routeParams;
                }
                selectedItem.widgets.push(widget);
                if (!nextHref && selectedItem.id) {
                    nextHref = new URI().path("/dashboard/id/" + selectedItem.id).query({
                        'main-tab': 'dashboard',
                        'sub-tab': 'dashboard-' + selectedItem.id
                    }).removeQuery('href').removeQuery('title').removeQuery('iframe').removeQuery('size');
                }
            });
            var commitMessage = "Add widget";
            dashboardRepository.putDashboards(selected, commitMessage, function (dashboards) {
                if (nextHref) {
                    $location.path(nextHref.path()).search(nextHref.query(true));
                    Core.$apply($scope);
                }
            });
        };
        $scope.create = function () {
            var counter = dashboards().length + 1;
            var title = "Untitled" + counter;
            var modal = $modal.open({
                templateUrl: UrlHelpers.join(Dashboard.templatePath, 'createDashboardModal.html'),
                controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                    $scope.entity = {
                        title: title
                    };
                    $scope.config = {
                        properties: {
                            'title': {
                                type: 'string',
                            }
                        }
                    };
                    $scope.ok = function () {
                        modal.close();
                        var title = $scope.entity.title;
                        var newDash = dashboardRepository.createDashboard({ title: title });
                        dashboardRepository.putDashboards([newDash], "Created new dashboard: " + title, function (dashboards) {
                            deselectAll();
                            Dashboard.setSubTabs(nav.builder(), dashboards, $rootScope);
                            dashboardLoaded(null, dashboards);
                        });
                    };
                    $scope.cancel = function () {
                        modal.dismiss();
                    };
                }]
            });
        };
        $scope.duplicate = function () {
            var newDashboards = [];
            var commitMessage = "Duplicated dashboard(s) ";
            angular.forEach($scope.gridOptions.selectedItems, function (item, idx) {
                var commitMessage = "Duplicated dashboard " + item.title;
                var newDash = dashboardRepository.cloneDashboard(item);
                newDashboards.push(newDash);
            });
            deselectAll();
            commitMessage = commitMessage + newDashboards.map(function (d) {
                return d.title;
            }).join(',');
            dashboardRepository.putDashboards(newDashboards, commitMessage, function (dashboards) {
                Dashboard.setSubTabs(nav.builder(), dashboards, $rootScope);
                dashboardLoaded(null, dashboards);
            });
        };
        $scope.renameDashboard = function () {
            if ($scope.gridOptions.selectedItems.length === 1) {
                var selected = _.first($scope.gridOptions.selectedItems);
                var modal = $modal.open({
                    templateUrl: UrlHelpers.join(Dashboard.templatePath, 'renameDashboardModal.html'),
                    controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                        $scope.config = {
                            properties: {
                                'title': {
                                    type: 'string',
                                    default: selected.title
                                }
                            }
                        };
                        $scope.selected = selected;
                        $scope.ok = function () {
                            modal.close();
                            dashboardRepository.putDashboards([$scope.selected], 'renamed dashboard', function (dashboards) {
                                deselectAll();
                                Dashboard.setSubTabs(nav.builder(), dashboards, $rootScope);
                                dashboardLoaded(null, dashboards);
                            });
                        };
                        $scope.cancel = function () {
                            modal.dismiss();
                        };
                    }]
                });
            }
        };
        $scope.deleteDashboard = function () {
            if ($scope.hasSelection()) {
                var selected = $scope.gridOptions.selectedItems;
                var modal = $modal.open({
                    templateUrl: UrlHelpers.join(Dashboard.templatePath, 'deleteDashboardModal.html'),
                    controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                        $scope.selected = selected;
                        $scope.ok = function () {
                            modal.close();
                            dashboardRepository.deleteDashboards($scope.selected, function (dashboards) {
                                deselectAll();
                                Dashboard.setSubTabs(nav.builder(), dashboards, $rootScope);
                                dashboardLoaded(null, dashboards);
                            });
                        };
                        $scope.cancel = function () {
                            modal.dismiss();
                        };
                    }]
                });
            }
        };
        $scope.gist = function () {
            if ($scope.gridOptions.selectedItems.length > 0) {
                var id = $scope.selectedItems[0].id;
                $location.path("/dashboard/id/" + id + "/share");
            }
        };
        function updateData() {
            var url = $routeParams["href"];
            if (url) {
                $scope.url = decodeURIComponent(url);
            }
            var routeParams = $routeParams["routeParams"];
            if (routeParams) {
                $scope.routeParams = decodeURIComponent(routeParams);
            }
            var size = $routeParams["size"];
            if (size) {
                size = decodeURIComponent(size);
                $scope.preferredSize = angular.fromJson(size);
            }
            var title = $routeParams["title"];
            if (title) {
                title = decodeURIComponent(title);
                $scope.widgetTitle = title;
            }
            dashboardRepository.getDashboards(function (dashboards) {
                dashboardLoaded(null, dashboards);
            });
        }
        function dashboardLoaded(event, dashboards) {
            dashboards.forEach(function (dashboard) {
                dashboard.hash = '?main-tab=dashboard&sub-tab=dashboard-' + dashboard.id;
            });
            $scope._dashboards = dashboards;
            if (event === null) {
                $scope.$emit('dashboardsUpdated', dashboards);
            }
            Core.$apply($rootScope);
        }
        function dashboards() {
            return $scope._dashboards;
        }
        function deselectAll() {
            $scope.gridOptions.selectedItems.length = 0;
        }
    }]);
})(Dashboard || (Dashboard = {}));

var Dashboard;
(function (Dashboard) {
    var RectangleLocation = (function () {
        function RectangleLocation(delegate, path, search, hash) {
            var _this = this;
            this.delegate = delegate;
            this._path = path;
            this._search = search;
            this._hash = hash;
            this.uri = new URI(path);
            this.uri.search(function (query) {
                return _this._search;
            });
        }
        RectangleLocation.prototype.absUrl = function () {
            return this.protocol() + this.host() + ":" + this.port() + this.path() + this.search();
        };
        RectangleLocation.prototype.hash = function (newHash) {
            if (newHash === void 0) { newHash = null; }
            if (newHash) {
                this.uri.search(newHash);
                return this;
            }
            return this._hash;
        };
        RectangleLocation.prototype.host = function () {
            return this.delegate.host();
        };
        RectangleLocation.prototype.path = function (newPath) {
            if (newPath === void 0) { newPath = null; }
            if (newPath) {
                this.uri.path(newPath);
                return this;
            }
            return this._path;
        };
        RectangleLocation.prototype.port = function () {
            return this.delegate.port();
        };
        RectangleLocation.prototype.protocol = function () {
            return this.delegate.port();
        };
        RectangleLocation.prototype.replace = function () {
            return this;
        };
        RectangleLocation.prototype.search = function (parametersMap) {
            if (parametersMap === void 0) { parametersMap = null; }
            if (parametersMap) {
                this.uri.search(parametersMap);
                return this;
            }
            return this._search;
        };
        RectangleLocation.prototype.url = function (newValue) {
            if (newValue === void 0) { newValue = null; }
            if (newValue) {
                this.uri = new URI(newValue);
                return this;
            }
            return this.absUrl();
        };
        return RectangleLocation;
    })();
    Dashboard.RectangleLocation = RectangleLocation;
})(Dashboard || (Dashboard = {}));

var Dashboard;
(function (Dashboard) {
    var modules = undefined;
    Dashboard._module.directive('hawtioDashboard', function () {
        modules = hawtioPluginLoader['modules'].filter(function (name) {
            return _.isString(name) && name !== 'ng';
        });
        return new Dashboard.GridsterDirective();
    });
    var GridsterDirective = (function () {
        function GridsterDirective() {
            this.restrict = 'A';
            this.replace = true;
            this.controller = ["$scope", "$element", "$attrs", "$location", "$routeParams", "$templateCache", "dashboardRepository", "$compile", "$templateRequest", "$interpolate", "$modal", "$sce", function ($scope, $element, $attrs, $location, $routeParams, $templateCache, dashboardRepository, $compile, $templateRequest, $interpolate, $modal, $sce) {
                var gridSize = 150;
                var gridMargin = 6;
                var gridHeight;
                $scope.gridX = gridSize;
                $scope.gridY = gridSize;
                $scope.widgetMap = {};
                $scope.$on('$destroy', function () {
                    angular.forEach($scope.widgetMap, function (value, key) {
                        if ('scope' in value) {
                            var scope = value['scope'];
                            scope.$destroy();
                        }
                    });
                });
                setTimeout(updateWidgets, 10);
                function removeWidget(widget) {
                    var gridster = getGridster();
                    var widgetElem = null;
                    var widgetData = $scope.widgetMap[widget.id];
                    if (widgetData) {
                        delete $scope.widgetMap[widget.id];
                        widgetElem = widgetData.widget;
                    }
                    if (!widgetElem) {
                        widgetElem = $("div").find("[data-widgetId='" + widget.id + "']").parent();
                    }
                    if (gridster && widgetElem) {
                        gridster.remove_widget(widgetElem);
                    }
                    if ($scope.dashboard) {
                        var widgets = $scope.dashboard.widgets;
                        if (widgets) {
                            widgets.remove(widget);
                        }
                    }
                    updateDashboardRepository("Removed widget " + widget.title);
                }
                ;
                function changeWidgetSize(widget, sizefunc, savefunc) {
                    if (!widget) {
                        Dashboard.log.debug("widget undefined");
                        return;
                    }
                    var gridster = getGridster();
                    Dashboard.log.debug("Widget ID: ", widget.id, " widgetMap: ", $scope.widgetMap);
                    var entry = $scope.widgetMap[widget.id];
                    var w = entry.widget;
                    sizefunc(entry);
                    gridster.resize_widget(w, entry.size_x, entry.size_y);
                    gridster.set_dom_grid_height();
                    setTimeout(function () {
                        savefunc(widget);
                    }, 50);
                }
                function onWidgetRenamed(widget) {
                    updateDashboardRepository("Renamed widget to " + widget.title);
                }
                ;
                function updateWidgets() {
                    $scope.id = $routeParams["dashboardId"];
                    $scope.idx = $routeParams["dashboardIndex"];
                    if ($scope.id) {
                        $scope.$emit('loadDashboards');
                        dashboardRepository.getDashboard($scope.id, onDashboardLoad);
                    }
                    else {
                        dashboardRepository.getDashboards(function (dashboards) {
                            $scope.$emit('dashboardsUpdated', dashboards);
                            var idx = $scope.idx ? parseInt($scope.idx) : 0;
                            var id = null;
                            if (dashboards.length > 0) {
                                var dashboard = dashboards.length > idx ? dashboards[idx] : dashboard[0];
                                id = dashboard.id;
                            }
                            if (id) {
                                $location.path("/dashboard/id/" + id);
                            }
                            else {
                                $location.path("/dashboard/edit");
                            }
                            Core.$apply($scope);
                        });
                    }
                }
                function onDashboardLoad(dashboard) {
                    $scope.dashboard = dashboard;
                    var widgets = ((dashboard) ? dashboard.widgets : null) || [];
                    var minHeight = 10;
                    var minWidth = 6;
                    angular.forEach(widgets, function (widget) {
                        if (!widget) {
                            Dashboard.log.debug("Undefined widget, skipping");
                            return;
                        }
                        if (angular.isDefined(widget.row) && minHeight < widget.row) {
                            minHeight = widget.row + 1;
                        }
                        if (angular.isDefined(widget.size_x && angular.isDefined(widget.col))) {
                            var rightEdge = widget.col + widget.size_x;
                            if (rightEdge > minWidth) {
                                minWidth = rightEdge + 1;
                            }
                        }
                    });
                    var gridster = $element.gridster({
                        widget_margins: [gridMargin, gridMargin],
                        widget_base_dimensions: [$scope.gridX, $scope.gridY],
                        extra_rows: minHeight,
                        extra_cols: minWidth,
                        max_size_x: minWidth,
                        max_size_y: minHeight,
                        draggable: {
                            stop: function (event, ui) {
                                if (serializeDashboard()) {
                                    updateDashboardRepository("Changing dashboard layout");
                                }
                            }
                        }
                    }).data('gridster');
                    var template = $templateCache.get("widgetTemplate");
                    var remaining = widgets.length;
                    function maybeFinishUp() {
                        remaining = remaining - 1;
                        if (remaining === 0) {
                            makeResizable();
                            getGridster().enable();
                            Core.$apply($scope);
                        }
                    }
                    function doRemoveWidget($modal, widget) {
                        Dashboard.log.debug("Remove widget: ", widget);
                        var modal = $modal.open({
                            templateUrl: UrlHelpers.join(Dashboard.templatePath, 'deleteWidgetModal.html'),
                            controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                                $scope.widget = widget;
                                $scope.ok = function () {
                                    modal.close();
                                    removeWidget($scope.widget);
                                };
                                $scope.cancel = function () {
                                    modal.dismiss();
                                };
                            }]
                        });
                    }
                    function doRenameWidget($modal, widget) {
                        Dashboard.log.debug("Rename widget: ", widget);
                        var modal = $modal.open({
                            templateUrl: UrlHelpers.join(Dashboard.templatePath, 'renameWidgetModal.html'),
                            controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                                $scope.widget = widget;
                                $scope.config = {
                                    properties: {
                                        'title': {
                                            type: 'string',
                                            default: widget.title
                                        }
                                    }
                                };
                                $scope.ok = function () {
                                    modal.close();
                                    onWidgetRenamed($scope.widget);
                                };
                                $scope.cancel = function () {
                                    modal.dismiss();
                                };
                            }]
                        });
                    }
                    angular.forEach(widgets, function (widget) {
                        var type = 'internal';
                        if ('iframe' in widget) {
                            type = 'external';
                        }
                        switch (type) {
                            case 'external':
                                var scope = $scope.$new();
                                scope.widget = widget;
                                scope.removeWidget = function (widget) { return doRemoveWidget($modal, widget); };
                                scope.renameWidget = function (widget) { return doRenameWidget($modal, widget); };
                                var widgetBody = angular.element($templateCache.get('iframeWidgetTemplate.html'));
                                var outerDiv = angular.element($templateCache.get('widgetBlockTemplate.html'));
                                widgetBody.find('iframe').attr('src', widget.iframe);
                                outerDiv.append($compile(widgetBody)(scope));
                                var w = gridster.add_widget(outerDiv, widget.size_x, widget.size_y, widget.col, widget.row);
                                $scope.widgetMap[widget.id] = {
                                    widget: w
                                };
                                maybeFinishUp();
                                break;
                            case 'internal':
                                var path = widget.path;
                                var search = null;
                                if (widget.search) {
                                    search = Dashboard.decodeURIComponentProperties(widget.search);
                                }
                                if (widget.routeParams) {
                                    _.extend(search, angular.fromJson(widget.routeParams));
                                }
                                var hash = widget.hash;
                                var location = new Dashboard.RectangleLocation($location, path, search, hash);
                                if (!widget.size_x || widget.size_x < 1) {
                                    widget.size_x = 1;
                                }
                                if (!widget.size_y || widget.size_y < 1) {
                                    widget.size_y = 1;
                                }
                                var tmpModuleName = 'dashboard-' + widget.id;
                                var tmpModule = angular.module(tmpModuleName, modules);
                                tmpModule.config(['$provide', function ($provide) {
                                    $provide.decorator('HawtioDashboard', ['$delegate', '$rootScope', function ($delegate, $rootScope) {
                                        $delegate.inDashboard = true;
                                        return $delegate;
                                    }]);
                                    $provide.decorator('$location', ['$delegate', function ($delegate) {
                                        return location;
                                    }]);
                                    $provide.decorator('$route', ['$delegate', function ($delegate) {
                                        return $delegate;
                                    }]);
                                    $provide.decorator('$routeParams', ['$delegate', function ($delegate) {
                                        return search;
                                    }]);
                                }]);
                                tmpModule.controller('HawtioDashboard.Title', ["$scope", "$modal", function ($scope, $modal) {
                                    $scope.widget = widget;
                                    $scope.removeWidget = function (widget) { return doRemoveWidget($modal, widget); };
                                    $scope.renameWidget = function (widget) { return doRenameWidget($modal, widget); };
                                }]);
                                var div = $(template);
                                div.attr({ 'data-widgetId': widget.id });
                                var body = div.find('.widget-body');
                                var widgetBody = $templateRequest(widget.include);
                                widgetBody.then(function (widgetBody) {
                                    var outerDiv = angular.element($templateCache.get('widgetBlockTemplate.html'));
                                    body.html(widgetBody);
                                    outerDiv.html(div);
                                    angular.bootstrap(div, [tmpModuleName]);
                                    var w = gridster.add_widget(outerDiv, widget.size_x, widget.size_y, widget.col, widget.row);
                                    $scope.widgetMap[widget.id] = {
                                        widget: w
                                    };
                                    maybeFinishUp();
                                });
                                break;
                        }
                    });
                }
                function serializeDashboard() {
                    var gridster = getGridster();
                    if (gridster) {
                        var data = gridster.serialize();
                        var widgets = $scope.dashboard.widgets || [];
                        angular.forEach(widgets, function (widget, idx) {
                            var value = data[idx];
                            if (value && widget) {
                                angular.forEach(value, function (attr, key) { return widget[key] = attr; });
                            }
                        });
                        return true;
                    }
                    return false;
                }
                function makeResizable() {
                    var blocks = $('.grid-block');
                    blocks.resizable('destroy');
                    blocks.resizable({
                        grid: [gridSize + (gridMargin * 2), gridSize + (gridMargin * 2)],
                        animate: false,
                        minWidth: gridSize,
                        minHeight: gridSize,
                        autoHide: false,
                        start: function (event, ui) {
                            gridHeight = getGridster().$el.height();
                        },
                        resize: function (event, ui) {
                            var g = getGridster();
                            var delta = gridSize + gridMargin * 2;
                            if (event.offsetY > g.$el.height()) {
                                var extra = Math.floor((event.offsetY - gridHeight) / delta + 1);
                                var newHeight = gridHeight + extra * delta;
                                g.$el.css('height', newHeight);
                            }
                        },
                        stop: function (event, ui) {
                            var resized = $(this);
                            setTimeout(function () {
                                resizeBlock(resized);
                            }, 300);
                        }
                    });
                    $('.ui-resizable-handle').hover(function () {
                        getGridster().disable();
                    }, function () {
                        getGridster().enable();
                    });
                }
                function resizeBlock(elmObj) {
                    var area = elmObj.find('.widget-area');
                    var w = elmObj.width() - gridSize;
                    var h = elmObj.height() - gridSize;
                    for (var grid_w = 1; w > 0; w -= (gridSize + (gridMargin * 2))) {
                        grid_w++;
                    }
                    for (var grid_h = 1; h > 0; h -= (gridSize + (gridMargin * 2))) {
                        grid_h++;
                    }
                    var widget = {
                        id: area.attr('data-widgetId')
                    };
                    changeWidgetSize(widget, function (widget) {
                        widget.size_x = grid_w;
                        widget.size_y = grid_h;
                    }, function (widget) {
                        if (serializeDashboard()) {
                            updateDashboardRepository("Changed size of widget: " + widget.id);
                        }
                    });
                }
                function updateDashboardRepository(message) {
                    if ($scope.dashboard) {
                        var commitMessage = message;
                        if ($scope.dashboard && $scope.dashboard.title) {
                            commitMessage += " on dashboard " + $scope.dashboard.title;
                        }
                        dashboardRepository.putDashboards([$scope.dashboard], commitMessage, Dashboard.onOperationComplete);
                    }
                }
                function getGridster() {
                    return $element.gridster().data('gridster');
                }
            }];
        }
        return GridsterDirective;
    })();
    Dashboard.GridsterDirective = GridsterDirective;
})(Dashboard || (Dashboard = {}));

var Dashboard;
(function (Dashboard) {
    Dashboard._module.controller("Dashboard.ImportController", ["$scope", "$location", "$routeParams", "dashboardRepository", function ($scope, $location, $routeParams, dashboardRepository) {
        $scope.placeholder = "Paste the JSON here for the dashboard configuration to import...";
        $scope.source = $scope.placeholder;
        var options = {
            mode: {
                name: "javascript"
            }
        };
        $scope.isValid = function () { return $scope.source && $scope.source !== $scope.placeholder; };
        $scope.importJSON = function () {
            var json = [];
            try {
                json = JSON.parse($scope.source);
            }
            catch (e) {
                json = [];
            }
            var array = [];
            if (angular.isArray(json)) {
                array = json;
            }
            else if (angular.isObject(json)) {
                array.push(json);
            }
            if (array.length) {
                angular.forEach(array, function (dash, index) {
                    angular.copy(dash, dashboardRepository.createDashboard(dash));
                });
                dashboardRepository.putDashboards(array, "Imported dashboard JSON", Dashboard.onOperationComplete);
                $location.path("/dashboard/edit");
            }
        };
    }]);
})(Dashboard || (Dashboard = {}));

var Dashboard;
(function (Dashboard) {
    Dashboard._module.controller("Dashboard.NavBarController", ["$scope", "$routeParams", "$rootScope", "dashboardRepository", function ($scope, $routeParams, $rootScope, dashboardRepository) {
        $scope._dashboards = [];
        $scope.activeDashboard = $routeParams['dashboardId'];
        $scope.$on('loadDashboards', loadDashboards);
        $scope.$on('dashboardsUpdated', dashboardLoaded);
        $scope.dashboards = function () {
            return $scope._dashboards;
        };
        $scope.onTabRenamed = function (dash) {
            dashboardRepository.putDashboards([dash], "Renamed dashboard", function (dashboards) {
                dashboardLoaded(null, dashboards);
            });
        };
        function dashboardLoaded(event, dashboards) {
            Dashboard.log.debug("navbar dashboardLoaded: ", dashboards);
            $scope._dashboards = dashboards;
            if (event === null) {
                $rootScope.$broadcast('dashboardsUpdated', dashboards);
                Core.$apply($scope);
            }
        }
        function loadDashboards(event) {
            dashboardRepository.getDashboards(function (dashboards) {
                dashboardLoaded(null, dashboards);
                Core.$apply($scope);
            });
        }
    }]);
})(Dashboard || (Dashboard = {}));

var Dashboard;
(function (Dashboard) {
    Dashboard.ShareController = Dashboard._module.controller("Dashboard.ShareController", ["$scope", "$location", "$routeParams", "dashboardRepository", function ($scope, $location, $routeParams, dashboardRepository) {
        var id = $routeParams["dashboardId"];
        dashboardRepository.getDashboard(id, onDashboardLoad);
        var options = {
            mode: {
                name: "javascript"
            }
        };
        function onDashboardLoad(dashboard) {
            $scope.dashboard = Dashboard.cleanDashboardData(dashboard);
            $scope.json = {
                "description": "hawtio dashboards",
                "public": true,
                "files": {
                    "dashboards.json": {
                        "content": JSON.stringify($scope.dashboard, null, "  ")
                    }
                }
            };
            $scope.source = JSON.stringify($scope.dashboard, null, "  ");
            Core.$applyNowOrLater($scope);
        }
    }]);
})(Dashboard || (Dashboard = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwiL2hvbWUvZ2FzaGNydW1iL1dvcmsvU291cmNlL2hhd3Rpby1kYXNoYm9hcmQvZGFzaGJvYXJkL3RzL2Rhc2hib2FyZEludGVyZmFjZXMudHMiLCIvaG9tZS9nYXNoY3J1bWIvV29yay9Tb3VyY2UvaGF3dGlvLWRhc2hib2FyZC9kYXNoYm9hcmQvdHMvZGFzaGJvYXJkSGVscGVycy50cyIsIi9ob21lL2dhc2hjcnVtYi9Xb3JrL1NvdXJjZS9oYXd0aW8tZGFzaGJvYXJkL2Rhc2hib2FyZC90cy9kYXNoYm9hcmRQbHVnaW4udHMiLCIvaG9tZS9nYXNoY3J1bWIvV29yay9Tb3VyY2UvaGF3dGlvLWRhc2hib2FyZC9kYXNoYm9hcmQvdHMvZGFzaGJvYXJkUmVwb3NpdG9yeS50cyIsIi9ob21lL2dhc2hjcnVtYi9Xb3JrL1NvdXJjZS9oYXd0aW8tZGFzaGJvYXJkL2Rhc2hib2FyZC90cy9lZGl0RGFzaGJvYXJkcy50cyIsIi9ob21lL2dhc2hjcnVtYi9Xb3JrL1NvdXJjZS9oYXd0aW8tZGFzaGJvYXJkL2Rhc2hib2FyZC90cy9yZWN0YW5nbGVMb2NhdGlvbi50cyIsIi9ob21lL2dhc2hjcnVtYi9Xb3JrL1NvdXJjZS9oYXd0aW8tZGFzaGJvYXJkL2Rhc2hib2FyZC90cy9ncmlkc3RlckRpcmVjdGl2ZS50cyIsIi9ob21lL2dhc2hjcnVtYi9Xb3JrL1NvdXJjZS9oYXd0aW8tZGFzaGJvYXJkL2Rhc2hib2FyZC90cy9pbXBvcnQudHMiLCIvaG9tZS9nYXNoY3J1bWIvV29yay9Tb3VyY2UvaGF3dGlvLWRhc2hib2FyZC9kYXNoYm9hcmQvdHMvbmF2YmFyLnRzIiwiL2hvbWUvZ2FzaGNydW1iL1dvcmsvU291cmNlL2hhd3Rpby1kYXNoYm9hcmQvZGFzaGJvYXJkL3RzL3NoYXJlLnRzIl0sIm5hbWVzIjpbIkRhc2hib2FyZCIsIkRhc2hib2FyZC5jbGVhbkRhc2hib2FyZERhdGEiLCJEYXNoYm9hcmQuZGVjb2RlVVJJQ29tcG9uZW50UHJvcGVydGllcyIsIkRhc2hib2FyZC5vbk9wZXJhdGlvbkNvbXBsZXRlIiwiRGFzaGJvYXJkLnNldFN1YlRhYnMiLCJEYXNoYm9hcmQuTG9jYWxEYXNoYm9hcmRSZXBvc2l0b3J5IiwiRGFzaGJvYXJkLkxvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeS5jb25zdHJ1Y3RvciIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkubG9hZERhc2hib2FyZHMiLCJEYXNoYm9hcmQuTG9jYWxEYXNoYm9hcmRSZXBvc2l0b3J5LnN0b3JlRGFzaGJvYXJkcyIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkuZGVsZXRlRGFzaGJvYXJkcyIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkcyIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkIiwiRGFzaGJvYXJkLkxvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeS5jcmVhdGVEYXNoYm9hcmQiLCJEYXNoYm9hcmQuTG9jYWxEYXNoYm9hcmRSZXBvc2l0b3J5LmNsb25lRGFzaGJvYXJkIiwiRGFzaGJvYXJkLkxvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeS5nZXRUeXBlIiwiRGFzaGJvYXJkLnVwZGF0ZURhdGEiLCJEYXNoYm9hcmQuZGFzaGJvYXJkTG9hZGVkIiwiRGFzaGJvYXJkLmRhc2hib2FyZHMiLCJEYXNoYm9hcmQuZGVzZWxlY3RBbGwiLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24iLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24uY29uc3RydWN0b3IiLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24uYWJzVXJsIiwiRGFzaGJvYXJkLlJlY3RhbmdsZUxvY2F0aW9uLmhhc2giLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24uaG9zdCIsIkRhc2hib2FyZC5SZWN0YW5nbGVMb2NhdGlvbi5wYXRoIiwiRGFzaGJvYXJkLlJlY3RhbmdsZUxvY2F0aW9uLnBvcnQiLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24ucHJvdG9jb2wiLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24ucmVwbGFjZSIsIkRhc2hib2FyZC5SZWN0YW5nbGVMb2NhdGlvbi5zZWFyY2giLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24udXJsIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLnJlbW92ZVdpZGdldCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci5jaGFuZ2VXaWRnZXRTaXplIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLm9uV2lkZ2V0UmVuYW1lZCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci51cGRhdGVXaWRnZXRzIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLm9uRGFzaGJvYXJkTG9hZCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci5vbkRhc2hib2FyZExvYWQubWF5YmVGaW5pc2hVcCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci5vbkRhc2hib2FyZExvYWQuZG9SZW1vdmVXaWRnZXQiLCJEYXNoYm9hcmQuR3JpZHN0ZXJEaXJlY3RpdmUuY29uc3RydWN0b3Iub25EYXNoYm9hcmRMb2FkLmRvUmVuYW1lV2lkZ2V0IiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLnNlcmlhbGl6ZURhc2hib2FyZCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci5tYWtlUmVzaXphYmxlIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLnJlc2l6ZUJsb2NrIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLnVwZGF0ZURhc2hib2FyZFJlcG9zaXRvcnkiLCJEYXNoYm9hcmQuR3JpZHN0ZXJEaXJlY3RpdmUuY29uc3RydWN0b3IuZ2V0R3JpZHN0ZXIiLCJEYXNoYm9hcmQubG9hZERhc2hib2FyZHMiLCJEYXNoYm9hcmQub25EYXNoYm9hcmRMb2FkIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FDcURDOztBQ2pERCxJQUFPLFNBQVMsQ0E0Q2Y7QUE1Q0QsV0FBTyxTQUFTLEVBQUMsQ0FBQztJQUVMQSxhQUFHQSxHQUFrQkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7SUFVeERBLFNBQWdCQSxrQkFBa0JBLENBQUNBLElBQUlBO1FBQ3JDQyxJQUFJQSxTQUFTQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNuQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsRUFBRUEsVUFBQ0EsS0FBS0EsRUFBRUEsR0FBR0E7WUFDL0JBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUM3RUEsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDekJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBLENBQUNBO1FBQ0hBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBO0lBQ25CQSxDQUFDQTtJQVJlRCw0QkFBa0JBLEdBQWxCQSxrQkFRZkEsQ0FBQUE7SUFVREEsU0FBZ0JBLDRCQUE0QkEsQ0FBQ0EsSUFBSUE7UUFDL0NF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QUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQTtZQUNoREEsSUFBSUEsVUFBVUEsR0FBR0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDM0JBLElBQUlBLE1BQU1BLEdBQUdBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ3BDQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUMxQkEsSUFBSUEsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7WUFDOUJBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBO1lBQ2xCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVEEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7Z0JBQzFCQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNyQ0EsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xCQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQTtnQkFDOUJBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBO1lBQ2xCQSxDQUFDQTtZQUNEQSxJQUFJQSxTQUFTQSxHQUFTQSxTQUFTQSxDQUFDQTtZQUNoQ0EsTUFBTUEsQ0FBQUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1pBLEtBQUtBLE1BQU1BO29CQUNUQSxhQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxRQUFRQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDMUJBLFNBQVNBLEdBQUdBLElBQUlBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUMxQkEsS0FBS0EsQ0FBQ0E7Z0JBQ1JBLEtB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Q0EsQ0FBQ0E7NEJBQ3hDQSxNQUFNQSxDQUFDQTt3QkFDVEEsQ0FBQ0E7d0JBQ0RBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBOzRCQUM1REEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0JBQzdCQSxDQUFDQTt3QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsSUFDNUJBLE9BQU9BLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBOzRCQUN0Q0EsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7NEJBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxHQUFHQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDekJBLFFBQVFBLEdBQUdBLFNBQVNBLEdBQUdBLENBQUNBLENBQUNBOzRCQUMzQkEsQ0FBQ0E7d0JBQ0hBLENBQUNBO29CQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFSEEsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7d0JBQy9CQSxjQUFjQSxFQUFFQSxDQUFDQSxVQUFVQSxFQUFFQSxVQUFVQSxDQUFDQTt3QkFDeENBLHNCQUFzQkEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsRUFBRUEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7d0JBQ3BEQSxVQUFVQSxFQUFFQSxTQUFTQTt3QkFDckJBLFVBQVVBLEVBQUVBLFFBQVFBO3dCQUNwQkEsVUFBVUEsRUFBRUEsUUFBUUE7d0JBQ3BCQSxVQUFVQSxFQUFFQSxTQUFTQTt3QkFD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QUFDQSxVQUFVQSxHQUFHQTtZQUNsQkEsSUFBSUEsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFFZEEsSUFBQUEsQ0FBQ0E7Z0JBQ0NBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ25DQSxDQUFFQTtZQUFBQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFWEEsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDWkEsQ0FBQ0E7WUFDREEsSUFBSUEsS0FBS0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDZkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzFCQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNmQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbENBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ25CQSxDQUFDQTtZQUVEQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFakJBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLFVBQUNBLElBQUlBLEVBQUVBLEtBQUtBO29CQUNqQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsbUJBQW1CQSxDQUFDQSxlQUFlQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDaEVBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxtQkFBbUJBLENBQUNBLGFBQWFBLENBQUNBLEtBQUtBLEVBQUVBLHlCQUF5QkEsRUFBRUEsU0FBU0EsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxDQUFDQTtn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RUFBRUEsRUFBRUEsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFFdERBLElBQUlBLE9BQU9BLEdBQUdBO1lBQ1pBLElBQUlBLEVBQUVBO2dCQUNGQSxJQUFJQSxFQUFFQSxZQUFZQTthQUNyQkE7U0FDRkEsQ0FBQ0E7UUFHRkEsU0FBU0EsZUFBZUEsQ0FBQ0EsU0FBU0E7WUFDaEMrQyxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxrQkFBa0JBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBRTNEQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQTtnQkFDWkEsYUFBYUEsRUFBRUEsbUJBQW1CQTtnQkFDbENBLFFBQVFBLEVBQUVBLElBQUlBO2dCQUNkQSxPQUFPQSxFQUFFQTtvQkFDUEEsaUJBQWlCQSxFQUFFQTt3QkFDakJBLFNBQVNBLEVBQUVBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBO3FCQUN4REE7aUJBQ0ZBO2FBQ0ZBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO1lBQzdEQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQ2hDQSxDQUFDQTtJQUNIL0MsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDTkEsQ0FBQ0EsRUE3Qk0sU0FBUyxLQUFULFNBQVMsUUE2QmYiLCJmaWxlIjoiY29tcGlsZWQuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGwsIm1vZHVsZSBEYXNoYm9hcmQge1xuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGFzaGJvYXJkU2VydmljZSB7XG4gICAgaGFzRGFzaGJvYXJkOmJvb2xlYW47XG4gICAgaW5EYXNoYm9hcmQ6Ym9vbGVhbjtcbiAgICBnZXRBZGRMaW5rKHRpdGxlPzpzdHJpbmcsIHdpZHRoPzpudW1iZXIsIGhlaWdodD86bnVtYmVyKTpzdHJpbmc7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFNlYXJjaE1hcCB7XG4gICAgW25hbWU6IHN0cmluZ106IHN0cmluZztcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGFzaGJvYXJkV2lkZ2V0IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgcm93PzogbnVtYmVyO1xuICAgIGNvbD86IG51bWJlcjtcbiAgICBzaXplX3g/OiBudW1iZXI7XG4gICAgc2l6ZV95PzogbnVtYmVyO1xuICAgIHBhdGg/OiBzdHJpbmc7XG4gICAgdXJsPzogc3RyaW5nO1xuICAgIGluY2x1ZGU/OiBzdHJpbmc7XG4gICAgc2VhcmNoPzogU2VhcmNoTWFwXG4gICAgcm91dGVQYXJhbXM/OiBzdHJpbmc7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIERhc2hib2FyZCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB0aXRsZTogc3RyaW5nO1xuICAgIGdyb3VwOiBzdHJpbmc7XG4gICAgd2lkZ2V0czogQXJyYXk8RGFzaGJvYXJkV2lkZ2V0PjtcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGVmYXVsdERhc2hib2FyZHMge1xuICAgIGFkZDogKGRhc2hiYXJkOkRhc2hib2FyZCkgPT4gdm9pZDtcbiAgICByZW1vdmU6IChpZDpzdHJpbmcpID0+IERhc2hib2FyZDtcbiAgICBnZXRBbGw6ICgpID0+IEFycmF5PERhc2hib2FyZD47XG4gIH1cblxuICAvKipcbiAgICogQmFzZSBpbnRlcmZhY2UgdGhhdCBkYXNoYm9hcmQgcmVwb3NpdG9yaWVzIG11c3QgaW1wbGVtZW50XG4gICAqXG4gICAqIEBjbGFzcyBEYXNoYm9hcmRSZXBvc2l0b3J5XG4gICAqL1xuICBleHBvcnQgaW50ZXJmYWNlIERhc2hib2FyZFJlcG9zaXRvcnkge1xuICAgIHB1dERhc2hib2FyZHM6IChhcnJheTphbnlbXSwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSA9PiBhbnk7XG4gICAgZGVsZXRlRGFzaGJvYXJkczogKGFycmF5OkFycmF5PERhc2hib2FyZD4sIGZuKSA9PiBhbnk7XG4gICAgZ2V0RGFzaGJvYXJkczogKGZuOihkYXNoYm9hcmRzOiBBcnJheTxEYXNoYm9hcmQ+KSA9PiB2b2lkKSA9PiB2b2lkO1xuICAgIGdldERhc2hib2FyZDogKGlkOnN0cmluZywgZm46IChkYXNoYm9hcmQ6IERhc2hib2FyZCkgPT4gdm9pZCkgPT4gYW55O1xuICAgIGNyZWF0ZURhc2hib2FyZDogKG9wdGlvbnM6YW55KSA9PiBhbnk7XG4gICAgY2xvbmVEYXNoYm9hcmQ6KGRhc2hib2FyZDphbnkpID0+IGFueTtcbiAgICBnZXRUeXBlOigpID0+IHN0cmluZztcbiAgfVxuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkSW50ZXJmYWNlcy50c1wiLz5cbi8qKlxuICogQG1vZHVsZSBEYXNoYm9hcmRcbiAqL1xubW9kdWxlIERhc2hib2FyZCB7XG5cbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KCdEYXNoYm9hcmQnKTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY2xlYW5lZCB1cCB2ZXJzaW9uIG9mIHRoZSBkYXNoYm9hcmQgZGF0YSB3aXRob3V0IGFueSBVSSBzZWxlY3Rpb24gc3RhdGVcbiAgICogQG1ldGhvZCBjbGVhbkRhc2hib2FyZERhdGFcbiAgICogQHN0YXRpY1xuICAgKiBAZm9yIERhc2hib2FyZFxuICAgKiBAcGFyYW0ge2FueX0gaXRlbVxuICAgKiBAcmV0dXJuIHthbnl9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gY2xlYW5EYXNoYm9hcmREYXRhKGl0ZW0pIHtcbiAgICB2YXIgY2xlYW5JdGVtID0ge307XG4gICAgYW5ndWxhci5mb3JFYWNoKGl0ZW0sICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBpZiAoIWFuZ3VsYXIuaXNTdHJpbmcoa2V5KSB8fCAoIWtleS5zdGFydHNXaXRoKFwiJFwiKSAmJiAha2V5LnN0YXJ0c1dpdGgoXCJfXCIpKSkge1xuICAgICAgICBjbGVhbkl0ZW1ba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBjbGVhbkl0ZW07XG4gIH1cblxuICAvKipcbiAgICogUnVucyBkZWNvZGVVUklDb21wb25lbnQoKSBvbiBlYWNoIHZhbHVlIGluIHRoZSBvYmplY3RcbiAgICogQG1ldGhvZCBkZWNvZGVVUklDb21wb25lbnRQcm9wZXJ0aWVzXG4gICAqIEBzdGF0aWNcbiAgICogQGZvciBEYXNoYm9hcmRcbiAgICogQHBhcmFtIHthbnl9IGhhc2hcbiAgICogQHJldHVybiB7YW55fVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVVSSUNvbXBvbmVudFByb3BlcnRpZXMoaGFzaCkge1xuICAgIGlmICghaGFzaCkge1xuICAgICAgcmV0dXJuIGhhc2g7XG4gICAgfVxuICAgIHZhciBkZWNvZGVIYXNoID0ge307XG4gICAgYW5ndWxhci5mb3JFYWNoKGhhc2gsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBkZWNvZGVIYXNoW2tleV0gPSB2YWx1ZSA/IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkgOiB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVjb2RlSGFzaDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBvbk9wZXJhdGlvbkNvbXBsZXRlKHJlc3VsdCkge1xuICAgIGNvbnNvbGUubG9nKFwiQ29tcGxldGVkIGFkZGluZyB0aGUgZGFzaGJvYXJkIHdpdGggcmVzcG9uc2UgXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbW9kdWxlIERhc2hib2FyZFxuICogQG1haW4gRGFzaGJvYXJkXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJkYXNoYm9hcmRIZWxwZXJzLnRzXCIvPlxubW9kdWxlIERhc2hib2FyZCB7XG4gIFxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9ICdwbHVnaW5zL2Rhc2hib2FyZC9odG1sLyc7XG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9ICdkYXNoYm9hcmQnO1xuICBcbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgW10pO1xuXG4gIF9tb2R1bGUuY29uZmlnKFtcIiRyb3V0ZVByb3ZpZGVyXCIsIFwiJHByb3ZpZGVcIiwgKCRyb3V0ZVByb3ZpZGVyLCAkcHJvdmlkZSkgPT4ge1xuXG4gICAgJHByb3ZpZGUuZGVjb3JhdG9yKCdIYXd0aW9EYXNoYm9hcmQnLCBbJyRkZWxlZ2F0ZScsICgkZGVsZWdhdGUpID0+IHtcbiAgICAgICRkZWxlZ2F0ZVsnaGFzRGFzaGJvYXJkJ10gPSB0cnVlO1xuICAgICAgJGRlbGVnYXRlWydnZXRBZGRMaW5rJ10gPSAodGl0bGU/OnN0cmluZywgc2l6ZV94PzpudW1iZXIsIHNpemVfeT86bnVtYmVyKSA9PiB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVVJJKCcvZGFzaGJvYXJkL2FkZCcpO1xuICAgICAgICB2YXIgY3VycmVudFVyaSA9IG5ldyBVUkkoKTtcbiAgICAgICAgLypcbiAgICAgICAgY3VycmVudFVyaS5yZW1vdmVRdWVyeSgnbWFpbi10YWInKTtcbiAgICAgICAgY3VycmVudFVyaS5yZW1vdmVRdWVyeSgnc3ViLXRhYicpO1xuICAgICAgICAqL1xuICAgICAgICB2YXIgd2lkZ2V0VXJpID0gbmV3IFVSSShjdXJyZW50VXJpLnBhdGgoKSk7XG4gICAgICAgIHdpZGdldFVyaS5xdWVyeShjdXJyZW50VXJpLnF1ZXJ5KHRydWUpKTtcbiAgICAgICAgdGFyZ2V0LnF1ZXJ5KChxdWVyeSkgPT4ge1xuICAgICAgICAgIHF1ZXJ5LmhyZWYgPSB3aWRnZXRVcmkudG9TdHJpbmcoKS5lc2NhcGVVUkwoKVxuICAgICAgICAgIGlmICh0aXRsZSkge1xuICAgICAgICAgICAgcXVlcnkudGl0bGUgPSB0aXRsZS5lc2NhcGVVUkwoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNpemVfeCAmJiBzaXplX3kpIHtcbiAgICAgICAgICAgIHF1ZXJ5LnNpemUgPSBhbmd1bGFyLnRvSnNvbih7c2l6ZV94OiBzaXplX3gsIHNpemVfeTogc2l6ZV95fSkuZXNjYXBlVVJMKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC50b1N0cmluZygpO1xuICAgICAgfVxuICAgICAgcmV0dXJuICRkZWxlZ2F0ZTtcbiAgICB9XSk7XG5cbiAgICAkcm91dGVQcm92aWRlci5cbiAgICAgICAgICAgIHdoZW4oJy9kYXNoYm9hcmQvYWRkJywge3RlbXBsYXRlVXJsOiBEYXNoYm9hcmQudGVtcGxhdGVQYXRoICsgJ2FkZFRvRGFzaGJvYXJkLmh0bWwnfSkuXG4gICAgICAgICAgICB3aGVuKCcvZGFzaGJvYXJkL2VkaXQnLCB7dGVtcGxhdGVVcmw6IERhc2hib2FyZC50ZW1wbGF0ZVBhdGggKyAnZWRpdERhc2hib2FyZHMuaHRtbCd9KS5cbiAgICAgICAgICAgIHdoZW4oJy9kYXNoYm9hcmQvaWR4LzpkYXNoYm9hcmRJbmRleCcsIHt0ZW1wbGF0ZVVybDogRGFzaGJvYXJkLnRlbXBsYXRlUGF0aCArICdkYXNoYm9hcmQuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZSB9KS5cbiAgICAgICAgICAgIHdoZW4oJy9kYXNoYm9hcmQvaWQvOmRhc2hib2FyZElkJywge3RlbXBsYXRlVXJsOiBEYXNoYm9hcmQudGVtcGxhdGVQYXRoICsgJ2Rhc2hib2FyZC5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlIH0pLlxuICAgICAgICAgICAgd2hlbignL2Rhc2hib2FyZC9pZC86ZGFzaGJvYXJkSWQvc2hhcmUnLCB7dGVtcGxhdGVVcmw6IERhc2hib2FyZC50ZW1wbGF0ZVBhdGggKyAnc2hhcmUuaHRtbCd9KS5cbiAgICAgICAgICAgIHdoZW4oJy9kYXNoYm9hcmQvaW1wb3J0Jywge3RlbXBsYXRlVXJsOiBEYXNoYm9hcmQudGVtcGxhdGVQYXRoICsgJ2ltcG9ydC5odG1sJ30pO1xuICB9XSk7XG5cbiAgX21vZHVsZS52YWx1ZSgndWkuY29uZmlnJywge1xuICAgIC8vIFRoZSB1aS1qcSBkaXJlY3RpdmUgbmFtZXNwYWNlXG4gICAganE6IHtcbiAgICAgIGdyaWRzdGVyOiB7XG4gICAgICAgIHdpZGdldF9tYXJnaW5zOiBbMTAsIDEwXSxcbiAgICAgICAgd2lkZ2V0X2Jhc2VfZGltZW5zaW9uczogWzE0MCwgMTQwXVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgdmFyIHRhYiA9IHVuZGVmaW5lZDtcblxuICBleHBvcnQgZnVuY3Rpb24gc2V0U3ViVGFicyhidWlsZGVyLCBkYXNoYm9hcmRzOkFycmF5PERhc2hib2FyZD4sICRyb290U2NvcGUpIHtcbiAgICBsb2cuZGVidWcoXCJVcGRhdGluZyBzdWItdGFic1wiKTtcbiAgICBpZiAoIXRhYi50YWJzKSB7XG4gICAgICB0YWIudGFicyA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YWIudGFicy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICBfLmZvckVhY2goZGFzaGJvYXJkcywgKGRhc2hib2FyZCkgPT4ge1xuICAgICAgdmFyIGNoaWxkID0gYnVpbGRlclxuICAgICAgICAuaWQoJ2Rhc2hib2FyZC0nICsgZGFzaGJvYXJkLmlkKVxuICAgICAgICAudGl0bGUoKCkgPT4gZGFzaGJvYXJkLnRpdGxlIHx8IGRhc2hib2FyZC5pZClcbiAgICAgICAgLmhyZWYoKCkgPT4ge1xuICAgICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFVybEhlbHBlcnMuam9pbignL2Rhc2hib2FyZC9pZCcsIGRhc2hib2FyZC5pZCkpXG4gICAgICAgICAgICB1cmkuc2VhcmNoKHtcbiAgICAgICAgICAgICAgJ21haW4tdGFiJzogcGx1Z2luTmFtZSxcbiAgICAgICAgICAgICAgJ3N1Yi10YWInOiAnZGFzaGJvYXJkLScgKyBkYXNoYm9hcmQuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiB1cmkudG9TdHJpbmcoKTtcbiAgICAgICAgfSlcbiAgICAgIC5idWlsZCgpO1xuICAgICAgdGFiLnRhYnMucHVzaChjaGlsZCk7XG4gICAgfSk7XG4gICAgdmFyIG1hbmFnZSA9IGJ1aWxkZXJcbiAgICAgIC5pZCgnZGFzaGJvYXJkLW1hbmFnZScpXG4gICAgICAudGl0bGUoKCkgPT4gJzxpIGNsYXNzPVwiZmEgZmEtcGVuY2lsXCI+PC9pPiZuYnNwO01hbmFnZScpXG4gICAgICAuaHJlZigoKSA9PiAnL2Rhc2hib2FyZC9lZGl0P21haW4tdGFiPWRhc2hib2FyZCZzdWItdGFiPWRhc2hib2FyZC1tYW5hZ2UnKVxuICAgICAgLmJ1aWxkKCk7XG4gICAgdGFiLnRhYnMucHVzaChtYW5hZ2UpO1xuICAgIHRhYi50YWJzLmZvckVhY2goKHRhYikgPT4ge1xuICAgICAgdGFiLmlzU2VsZWN0ZWQgPSAoKSA9PiB7XG4gICAgICAgIHZhciBpZCA9IHRhYi5pZC5yZXBsYWNlKCdkYXNoYm9hcmQtJywgJycpO1xuICAgICAgICB2YXIgdXJpID0gbmV3IFVSSSgpO1xuICAgICAgICByZXR1cm4gdXJpLnF1ZXJ5KHRydWUpWydzdWItdGFiJ10gPT09IHRhYi5pZCB8fCBfLmVuZHNXaXRoKHVyaS5wYXRoKCksIGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBDb3JlLiRhcHBseSgkcm9vdFNjb3BlKTtcbiAgfVxuXG4gIF9tb2R1bGUucnVuKFtcIkhhd3Rpb05hdlwiLCBcImRhc2hib2FyZFJlcG9zaXRvcnlcIiwgXCIkcm9vdFNjb3BlXCIsIFwiSGF3dGlvRGFzaGJvYXJkXCIsIFwiJHRpbWVvdXRcIiwgKG5hdjpIYXd0aW9NYWluTmF2LlJlZ2lzdHJ5LCBkYXNoYm9hcmRzOkRhc2hib2FyZFJlcG9zaXRvcnksICRyb290U2NvcGUsIGRhc2g6RGFzaGJvYXJkU2VydmljZSwgJHRpbWVvdXQpID0+IHtcbiAgICAvLyBzcGVjaWFsIGNhc2UgaGVyZSwgd2UgZG9uJ3Qgd2FudCB0byBvdmVyd3JpdGUgb3VyIHN0b3JlZCB0YWIhXG4gICAgaWYgKCFkYXNoLmluRGFzaGJvYXJkKSB7XG4gICAgICB2YXIgYnVpbGRlciA9IG5hdi5idWlsZGVyKCk7XG4gICAgICB0YWIgPSBidWlsZGVyLmlkKHBsdWdpbk5hbWUpXG4gICAgICAgIC5ocmVmKCgpID0+ICcvZGFzaGJvYXJkL2lkeC8wJylcbiAgICAgICAgLnRpdGxlKCgpID0+ICdEYXNoYm9hcmQnKVxuICAgICAgICAuYnVpbGQoKTtcbiAgICAgIG5hdi5hZGQodGFiKTtcbiAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgZGFzaGJvYXJkcy5nZXREYXNoYm9hcmRzKChkYXNoYm9hcmRzKSA9PiB7XG4gICAgICAgICAgc2V0U3ViVGFicyhidWlsZGVyLCBkYXNoYm9hcmRzLCAkcm9vdFNjb3BlKTtcbiAgICAgICAgfSk7XG4gICAgICB9LCA1MDApO1xuICAgIH1cbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkUGx1Z2luLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImRhc2hib2FyZEludGVyZmFjZXMudHNcIi8+XG4vKipcbiAqIEBtb2R1bGUgRGFzaGJvYXJkXG4gKi9cbm1vZHVsZSBEYXNoYm9hcmQge1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnZGFzaGJvYXJkUmVwb3NpdG9yeScsIFsnRGVmYXVsdERhc2hib2FyZHMnLCAoZGVmYXVsdHM6RGVmYXVsdERhc2hib2FyZHMpID0+IHtcbiAgICByZXR1cm4gbmV3IExvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeShkZWZhdWx0cyk7XG4gIH1dKTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ0RlZmF1bHREYXNoYm9hcmRzJywgWygpID0+IHtcbiAgICB2YXIgZGVmYXVsdHMgPSA8QXJyYXk8RGFzaGJvYXJkPj5bXTtcbiAgICB2YXIgYW5zd2VyID0ge1xuICAgICAgYWRkOiAoZGFzaGJvYXJkOkRhc2hib2FyZCkgPT4ge1xuICAgICAgICBkZWZhdWx0cy5wdXNoKGRhc2hib2FyZCk7XG4gICAgICB9LFxuICAgICAgcmVtb3ZlOiAoaWQ6c3RyaW5nKSA9PiB7XG4gICAgICAgIHJldHVybiBfLnJlbW92ZShkZWZhdWx0cywgKGRhc2hib2FyZCkgPT4gZGFzaGJvYXJkLmlkID09PSBpZCk7XG4gICAgICB9LFxuICAgICAgZ2V0QWxsOiAoKSA9PiBkZWZhdWx0c1xuICAgIH1cbiAgICByZXR1cm4gYW5zd2VyO1xuICB9XSk7XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBMb2NhbERhc2hib2FyZFJlcG9zaXRvcnlcbiAgICogQHVzZXMgRGFzaGJvYXJkUmVwb3NpdG9yeVxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIExvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeSBpbXBsZW1lbnRzIERhc2hib2FyZFJlcG9zaXRvcnkge1xuXG4gICAgcHJpdmF0ZSBsb2NhbFN0b3JhZ2U6V2luZG93TG9jYWxTdG9yYWdlID0gbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgZGVmYXVsdHM6RGVmYXVsdERhc2hib2FyZHMpIHtcbiAgICAgIHRoaXMubG9jYWxTdG9yYWdlID0gQ29yZS5nZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgIC8qXG4gICAgICBpZiAoJ3VzZXJEYXNoYm9hcmRzJyBpbiB0aGlzLmxvY2FsU3RvcmFnZSkge1xuICAgICAgICBsb2cuZGVidWcoXCJGb3VuZCBwcmV2aW91c2x5IHNhdmVkIGRhc2hib2FyZHNcIik7XG4gICAgICAgIGlmICh0aGlzLmxvYWREYXNoYm9hcmRzKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5zdG9yZURhc2hib2FyZHMoZGVmYXVsdHMuZ2V0QWxsKCkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0b3JlRGFzaGJvYXJkcyhkZWZhdWx0cy5nZXRBbGwoKSk7XG4gICAgICB9XG4gICAgICAqL1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9hZERhc2hib2FyZHMoKSB7XG4gICAgICB2YXIgYW5zd2VyID0gYW5ndWxhci5mcm9tSnNvbihsb2NhbFN0b3JhZ2VbJ3VzZXJEYXNoYm9hcmRzJ10pO1xuICAgICAgaWYgKCFhbnN3ZXIgfHwgYW5zd2VyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBhbnN3ZXIgPSB0aGlzLmRlZmF1bHRzLmdldEFsbCgpO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwicmV0dXJuaW5nIGRhc2hib2FyZHM6IFwiLCBhbnN3ZXIpO1xuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIHN0b3JlRGFzaGJvYXJkcyhkYXNoYm9hcmRzOmFueVtdKSB7XG4gICAgICBsb2cuZGVidWcoXCJzdG9yaW5nIGRhc2hib2FyZHM6IFwiLCBkYXNoYm9hcmRzKTtcbiAgICAgIGxvY2FsU3RvcmFnZVsndXNlckRhc2hib2FyZHMnXSA9IGFuZ3VsYXIudG9Kc29uKGRhc2hib2FyZHMpO1xuICAgICAgcmV0dXJuIHRoaXMubG9hZERhc2hib2FyZHMoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHV0RGFzaGJvYXJkcyhhcnJheTphbnlbXSwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgZGFzaGJvYXJkcyA9IHRoaXMubG9hZERhc2hib2FyZHMoKTtcbiAgICAgIGFycmF5LmZvckVhY2goKGRhc2gpID0+IHtcbiAgICAgICAgdmFyIGV4aXN0aW5nID0gZGFzaGJvYXJkcy5maW5kSW5kZXgoKGQpID0+IHsgcmV0dXJuIGQuaWQgPT09IGRhc2guaWQ7IH0pO1xuICAgICAgICBpZiAoZXhpc3RpbmcgPj0gMCkge1xuICAgICAgICAgIGRhc2hib2FyZHNbZXhpc3RpbmddID0gZGFzaDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkYXNoYm9hcmRzLnB1c2goZGFzaCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgZm4odGhpcy5zdG9yZURhc2hib2FyZHMoZGFzaGJvYXJkcykpO1xuICAgIH1cblxuICAgIHB1YmxpYyBkZWxldGVEYXNoYm9hcmRzKGFycmF5OmFueVtdLCBmbikge1xuICAgICAgdmFyIGRhc2hib2FyZHMgPSB0aGlzLmxvYWREYXNoYm9hcmRzKCk7XG4gICAgICBhbmd1bGFyLmZvckVhY2goYXJyYXksIChpdGVtKSA9PiB7XG4gICAgICAgIGRhc2hib2FyZHMucmVtb3ZlKChpKSA9PiB7IHJldHVybiBpLmlkID09PSBpdGVtLmlkOyB9KTtcbiAgICAgIH0pO1xuICAgICAgZm4odGhpcy5zdG9yZURhc2hib2FyZHMoZGFzaGJvYXJkcykpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXREYXNoYm9hcmRzKGZuKSB7XG4gICAgICBmbih0aGlzLmxvYWREYXNoYm9hcmRzKCkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXREYXNoYm9hcmQoaWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIGRhc2hib2FyZHMgPSB0aGlzLmxvYWREYXNoYm9hcmRzKCk7XG4gICAgICB2YXIgZGFzaGJvYXJkID0gZGFzaGJvYXJkcy5maW5kKChkYXNoYm9hcmQpID0+IHsgcmV0dXJuIGRhc2hib2FyZC5pZCA9PT0gaWQgfSk7XG4gICAgICBmbihkYXNoYm9hcmQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBjcmVhdGVEYXNoYm9hcmQob3B0aW9uczphbnkpIHtcbiAgICAgIHZhciBhbnN3ZXIgPXtcbiAgICAgICAgdGl0bGU6IFwiTmV3IERhc2hib2FyZFwiLFxuICAgICAgICBncm91cDogXCJQZXJzb25hbFwiLFxuICAgICAgICB3aWRnZXRzOiBbXVxuICAgICAgfTtcbiAgICAgIGFuc3dlciA9IGFuZ3VsYXIuZXh0ZW5kKGFuc3dlciwgb3B0aW9ucyk7XG4gICAgICBhbnN3ZXJbJ2lkJ10gPSBDb3JlLmdldFVVSUQoKTtcbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgcHVibGljIGNsb25lRGFzaGJvYXJkKGRhc2hib2FyZDphbnkpIHtcbiAgICAgIHZhciBuZXdEYXNoYm9hcmQgPSBPYmplY3QuY2xvbmUoZGFzaGJvYXJkKTtcbiAgICAgIG5ld0Rhc2hib2FyZFsnaWQnXSA9IENvcmUuZ2V0VVVJRCgpO1xuICAgICAgbmV3RGFzaGJvYXJkWyd0aXRsZSddID0gXCJDb3B5IG9mIFwiICsgZGFzaGJvYXJkLnRpdGxlO1xuICAgICAgcmV0dXJuIG5ld0Rhc2hib2FyZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0VHlwZSgpIHtcbiAgICAgIHJldHVybiAnY29udGFpbmVyJztcbiAgICB9XG4gIH1cblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cImRhc2hib2FyZFBsdWdpbi50c1wiLz5cbi8qKlxuICogQG1vZHVsZSBEYXNoYm9hcmRcbiAqL1xubW9kdWxlIERhc2hib2FyZCB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiRGFzaGJvYXJkLkVkaXREYXNoYm9hcmRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm91dGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm9vdFNjb3BlXCIsIFwiZGFzaGJvYXJkUmVwb3NpdG9yeVwiLCBcIkhhd3Rpb05hdlwiLCBcIiR0aW1lb3V0XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbW9kYWxcIiwgKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkcm91dGUsICRsb2NhdGlvbiwgJHJvb3RTY29wZSwgZGFzaGJvYXJkUmVwb3NpdG9yeTpEYXNoYm9hcmRSZXBvc2l0b3J5LCBuYXYsICR0aW1lb3V0LCAkdGVtcGxhdGVDYWNoZSwgJG1vZGFsKSA9PiB7XG5cbiAgICAkc2NvcGUuX2Rhc2hib2FyZHMgPSBbXTtcblxuICAgICRyb290U2NvcGUuJG9uKCdkYXNoYm9hcmRzVXBkYXRlZCcsIGRhc2hib2FyZExvYWRlZCk7XG5cbiAgICAkc2NvcGUuaGFzVXJsID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICgkc2NvcGUudXJsKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmhhc1NlbGVjdGlvbiA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGggIT09IDA7XG4gICAgfTtcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBzaG93Q29sdW1uTWVudTogZmFsc2UsXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgZGF0YTogJ19kYXNoYm9hcmRzJyxcbiAgICAgIHNlbGVjdFdpdGhDaGVja2JveE9ubHk6IHRydWUsXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3RpdGxlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0Rhc2hib2FyZCcsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ2VkaXREYXNoYm9hcmRUaXRsZUNlbGwuaHRtbCcpKVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdncm91cCcsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdHcm91cCdcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICB9O1xuXG4gICAgdmFyIGRvVXBkYXRlID0gXy5kZWJvdW5jZSh1cGRhdGVEYXRhLCAxMCk7XG5cbiAgICAvLyBoZWxwZXJzIHNvIHdlIGNhbiBlbmFibGUvZGlzYWJsZSBwYXJ0cyBvZiB0aGUgVUkgZGVwZW5kaW5nIG9uIGhvd1xuICAgIC8vIGRhc2hib2FyZCBkYXRhIGlzIHN0b3JlZFxuICAgIC8qXG4gICAgJHNjb3BlLnVzaW5nR2l0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0VHlwZSgpID09PSAnZ2l0JztcbiAgICB9O1xuXG4gICAgJHNjb3BlLnVzaW5nRmFicmljID0gKCkgPT4ge1xuICAgICAgcmV0dXJuIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0VHlwZSgpID09PSAnZmFicmljJztcbiAgICB9O1xuXG4gICAgJHNjb3BlLnVzaW5nTG9jYWwgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gZGFzaGJvYXJkUmVwb3NpdG9yeS5nZXRUeXBlKCkgPT09ICdjb250YWluZXInO1xuICAgIH07XG5cbiAgICBpZiAoJHNjb3BlLnVzaW5nRmFicmljKCkpIHtcbiAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5jb2x1bW5EZWZzLmFkZChbe1xuICAgICAgICBmaWVsZDogJ3ZlcnNpb25JZCcsXG4gICAgICAgIGRpc3BsYXlOYW1lOiAnVmVyc2lvbidcbiAgICAgIH0sIHtcbiAgICAgICAgZmllbGQ6ICdwcm9maWxlSWQnLFxuICAgICAgICBkaXNwbGF5TmFtZTogJ1Byb2ZpbGUnXG4gICAgICB9LCB7XG4gICAgICAgIGZpZWxkOiAnZmlsZU5hbWUnLFxuICAgICAgICBkaXNwbGF5TmFtZTogJ0ZpbGUgTmFtZSdcbiAgICAgIH1dKTtcbiAgICB9XG4gICAgKi9cblxuICAgICR0aW1lb3V0KGRvVXBkYXRlLCAxMCk7XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgJHRpbWVvdXQoZG9VcGRhdGUsIDEwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5hZGRWaWV3VG9EYXNoYm9hcmQgPSAoKSA9PiB7XG4gICAgICB2YXIgbmV4dEhyZWYgPSBudWxsO1xuICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgY3VycmVudFVybCA9IG5ldyBVUkkoKTtcbiAgICAgIHZhciBjb25maWcgPSBjdXJyZW50VXJsLnF1ZXJ5KHRydWUpO1xuICAgICAgdmFyIGhyZWYgPSBjb25maWdbJ2hyZWYnXTtcbiAgICAgIHZhciBpZnJhbWUgPSBjb25maWdbJ2lmcmFtZSddO1xuICAgICAgdmFyIHR5cGUgPSAnaHJlZic7XG4gICAgICBpZiAoaHJlZikge1xuICAgICAgICBocmVmID0gaHJlZi51bmVzY2FwZVVSTCgpO1xuICAgICAgICBocmVmID0gQ29yZS50cmltTGVhZGluZyhocmVmLCAnIycpO1xuICAgICAgfSBlbHNlIGlmIChpZnJhbWUpIHtcbiAgICAgICAgaWZyYW1lID0gaWZyYW1lLnVuZXNjYXBlVVJMKCk7XG4gICAgICAgIHR5cGUgPSAnaWZyYW1lJztcbiAgICAgIH1cbiAgICAgIHZhciB3aWRnZXRVUkkgPSA8YW55PiB1bmRlZmluZWQ7XG4gICAgICBzd2l0Y2godHlwZSkge1xuICAgICAgICBjYXNlICdocmVmJzpcbiAgICAgICAgICBsb2cuZGVidWcoXCJocmVmOiBcIiwgaHJlZik7XG4gICAgICAgICAgd2lkZ2V0VVJJID0gbmV3IFVSSShocmVmKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaWZyYW1lJzpcbiAgICAgICAgICBsb2cuZGVidWcoXCJpZnJhbWU6IFwiLCBpZnJhbWUpO1xuICAgICAgICAgIHdpZGdldFVSSSA9IG5ldyBVUkkoaWZyYW1lKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBsb2cuZGVidWcoXCJ0eXBlIHVua25vd25cIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIHNpemVTdHIgPSA8YW55PiBjb25maWdbJ3NpemUnXTtcbiAgICAgIGlmIChzaXplU3RyKSB7XG4gICAgICAgIHNpemVTdHIgPSBzaXplU3RyLnVuZXNjYXBlVVJMKCk7XG4gICAgICB9XG4gICAgICB2YXIgc2l6ZSA9IGFuZ3VsYXIuZnJvbUpzb24oc2l6ZVN0cikgfHwgeyBzaXplX3g6IDEsIHNpemVfeTogMSB9O1xuICAgICAgdmFyIHRpdGxlID0gKGNvbmZpZ1sndGl0bGUnXSB8fCAnJykudW5lc2NhcGVVUkwoKTtcbiAgICAgIHZhciB0ZW1wbGF0ZVdpZGdldCA9IHtcbiAgICAgICAgaWQ6IHVuZGVmaW5lZCxcbiAgICAgICAgcm93OiAxLFxuICAgICAgICBjb2w6IDEsXG4gICAgICAgIHNpemVfeDogc2l6ZS5zaXplX3gsXG4gICAgICAgIHNpemVfeTogc2l6ZS5zaXplX3ksXG4gICAgICAgIHRpdGxlOiB0aXRsZVxuICAgICAgfVxuICAgICAgYW5ndWxhci5mb3JFYWNoKHNlbGVjdGVkLCAoc2VsZWN0ZWRJdGVtKSA9PiB7XG5cbiAgICAgICAgdmFyIHdpZGdldCA9IF8uY2xvbmVEZWVwKHRlbXBsYXRlV2lkZ2V0KTtcblxuICAgICAgICBpZiAoIXNlbGVjdGVkSXRlbS53aWRnZXRzKSB7XG4gICAgICAgICAgc2VsZWN0ZWRJdGVtLndpZGdldHMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmV4dE51bWJlciA9IHNlbGVjdGVkSXRlbS53aWRnZXRzLmxlbmd0aCArIDE7XG4gICAgICAgIHdpZGdldC5pZCA9ICd3JyArIG5leHROdW1iZXI7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIndpZGdldFVSSTogXCIsIHdpZGdldFVSSS50b1N0cmluZygpKTtcblxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdpZnJhbWUnOiBcbiAgICAgICAgICAgIHdpZGdldCA9IDxhbnk+Xy5leHRlbmQoe1xuICAgICAgICAgICAgICBpZnJhbWU6IGlmcmFtZVxuICAgICAgICAgICAgfSwgd2lkZ2V0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2hyZWYnOlxuICAgICAgICAgICAgdmFyIHRleHQgPSB3aWRnZXRVUkkucGF0aCgpO1xuICAgICAgICAgICAgdmFyIHNlYXJjaCA9IHdpZGdldFVSSS5xdWVyeSh0cnVlKTtcbiAgICAgICAgICAgIGlmICgkcm91dGUgJiYgJHJvdXRlLnJvdXRlcykge1xuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSAkcm91dGUucm91dGVzW3RleHRdO1xuICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGVVcmwgPSB2YWx1ZVtcInRlbXBsYXRlVXJsXCJdO1xuICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZVVybCkge1xuICAgICAgICAgICAgICAgICAgd2lkZ2V0ID0gPGFueT4gXy5leHRlbmQoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0ZXh0LFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlOiB0ZW1wbGF0ZVVybCxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBzZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IFwiXCJcbiAgICAgICAgICAgICAgICAgIH0sIHdpZGdldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gd2UgbmVlZCB0byBiZSBhYmxlIHRvIG1hdGNoIFVSSSB0ZW1wbGF0ZXMuLi5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZpZ3VyZSBvdXQgdGhlIHdpZHRoIG9mIHRoZSBkYXNoXG4gICAgICAgIHZhciBncmlkV2lkdGggPSAwO1xuXG4gICAgICAgIHNlbGVjdGVkSXRlbS53aWRnZXRzLmZvckVhY2goKHcpID0+IHtcbiAgICAgICAgICB2YXIgcmlnaHRTaWRlID0gdy5jb2wgKyB3LnNpemVfeDtcbiAgICAgICAgICBpZiAocmlnaHRTaWRlID4gZ3JpZFdpZHRoKSB7XG4gICAgICAgICAgICBncmlkV2lkdGggPSByaWdodFNpZGU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgZm91bmQgPSBmYWxzZTtcblxuICAgICAgICB2YXIgbGVmdCA9ICh3KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHcuY29sO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByaWdodCA9ICh3KSAgPT4ge1xuICAgICAgICAgIHJldHVybiB3LmNvbCArIHcuc2l6ZV94IC0gMTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdG9wID0gKHcpID0+IHtcbiAgICAgICAgICByZXR1cm4gdy5yb3c7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJvdHRvbSA9ICh3KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHcucm93ICsgdy5zaXplX3kgLSAxO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBjb2xsaXNpb24gPSAodzEsIHcyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuICEoIGxlZnQodzIpID4gcmlnaHQodzEpIHx8XG4gICAgICAgICAgICAgIHJpZ2h0KHcyKSA8IGxlZnQodzEpIHx8XG4gICAgICAgICAgICAgIHRvcCh3MikgPiBib3R0b20odzEpIHx8XG4gICAgICAgICAgICAgIGJvdHRvbSh3MikgPCB0b3AodzEpKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtLndpZGdldHMuaXNFbXB0eSgpKSB7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKCFmb3VuZCkge1xuICAgICAgICAgIHdpZGdldC5jb2wgPSAxO1xuICAgICAgICAgIGlmICh3aWRnZXQuY29sICsgd2lkZ2V0LnNpemVfeCA+IGdyaWRXaWR0aCkge1xuICAgICAgICAgICAgLy8gbGV0J3Mgbm90IGxvb2sgZm9yIGEgcGxhY2UgbmV4dCB0byBleGlzdGluZyB3aWRnZXRcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbS53aWRnZXRzLmZvckVhY2goZnVuY3Rpb24odywgaWR4KSB7XG4gICAgICAgICAgICAgIGlmICh3aWRnZXQucm93IDw9IHcucm93KSB7XG4gICAgICAgICAgICAgICAgd2lkZ2V0LnJvdysrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yICg7ICh3aWRnZXQuY29sICsgd2lkZ2V0LnNpemVfeCkgPD0gZ3JpZFdpZHRoOyB3aWRnZXQuY29sKyspIHtcbiAgICAgICAgICAgIGlmICghc2VsZWN0ZWRJdGVtLndpZGdldHMuYW55KCh3KSA9PiB7XG4gICAgICAgICAgICAgIHZhciBjID0gY29sbGlzaW9uKHcsIHdpZGdldCk7XG4gICAgICAgICAgICAgIHJldHVybiBjXG4gICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICB3aWRnZXQucm93ID0gd2lkZ2V0LnJvdyArIDFcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8ganVzdCBpbiBjYXNlLCBrZWVwIHRoZSBzY3JpcHQgZnJvbSBydW5uaW5nIGF3YXkuLi5cbiAgICAgICAgICBpZiAod2lkZ2V0LnJvdyA+IDUwKSB7XG4gICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCRzY29wZS5yb3V0ZVBhcmFtcykge1xuICAgICAgICAgIHdpZGdldFsncm91dGVQYXJhbXMnXSA9ICRzY29wZS5yb3V0ZVBhcmFtcztcbiAgICAgICAgfVxuICAgICAgICBzZWxlY3RlZEl0ZW0ud2lkZ2V0cy5wdXNoKHdpZGdldCk7XG4gICAgICAgIGlmICghbmV4dEhyZWYgJiYgc2VsZWN0ZWRJdGVtLmlkKSB7XG4gICAgICAgICAgbmV4dEhyZWYgPSBuZXcgVVJJKCkucGF0aChcIi9kYXNoYm9hcmQvaWQvXCIgKyBzZWxlY3RlZEl0ZW0uaWQpLnF1ZXJ5KHtcbiAgICAgICAgICAgICdtYWluLXRhYic6ICdkYXNoYm9hcmQnLFxuICAgICAgICAgICAgJ3N1Yi10YWInOiAnZGFzaGJvYXJkLScgKyBzZWxlY3RlZEl0ZW0uaWRcbiAgICAgICAgICB9KS5yZW1vdmVRdWVyeSgnaHJlZicpXG4gICAgICAgICAgICAucmVtb3ZlUXVlcnkoJ3RpdGxlJylcbiAgICAgICAgICAgIC5yZW1vdmVRdWVyeSgnaWZyYW1lJylcbiAgICAgICAgICAgIC5yZW1vdmVRdWVyeSgnc2l6ZScpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSBhY3R1YWwgZGFzaGJvYXJkIGNvbmZpZ1xuICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIkFkZCB3aWRnZXRcIjtcbiAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyhzZWxlY3RlZCwgY29tbWl0TWVzc2FnZSwgKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgLypcbiAgICAgICAgbG9nLmRlYnVnKFwiUHV0IGRhc2hib2FyZHM6IFwiLCBkYXNoYm9hcmRzKTtcbiAgICAgICAgbG9nLmRlYnVnKFwiTmV4dCBocmVmOiBcIiwgbmV4dEhyZWYudG9TdHJpbmcoKSk7XG4gICAgICAgICovXG4gICAgICAgIGlmIChuZXh0SHJlZikge1xuICAgICAgICAgICRsb2NhdGlvbi5wYXRoKG5leHRIcmVmLnBhdGgoKSkuc2VhcmNoKG5leHRIcmVmLnF1ZXJ5KHRydWUpKTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIH07XG5cbiAgICAkc2NvcGUuY3JlYXRlID0gKCkgPT4ge1xuXG4gICAgICB2YXIgY291bnRlciA9IGRhc2hib2FyZHMoKS5sZW5ndGggKyAxO1xuICAgICAgdmFyIHRpdGxlID0gXCJVbnRpdGxlZFwiICsgY291bnRlcjtcblxuICAgICAgdmFyIG1vZGFsID0gJG1vZGFsLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZVVybDogVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ2NyZWF0ZURhc2hib2FyZE1vZGFsLmh0bWwnKSxcbiAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJG1vZGFsSW5zdGFuY2UnLCAoJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSkgPT4ge1xuICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgICAgICB0aXRsZTogdGl0bGVcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IHtcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgJ3RpdGxlJzoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICAkc2NvcGUub2sgPSAoKSA9PiB7XG4gICAgICAgICAgICBtb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgdmFyIHRpdGxlID0gJHNjb3BlLmVudGl0eS50aXRsZVxuICAgICAgICAgICAgdmFyIG5ld0Rhc2ggPSBkYXNoYm9hcmRSZXBvc2l0b3J5LmNyZWF0ZURhc2hib2FyZCh7IHRpdGxlOiB0aXRsZSB9KTtcbiAgICAgICAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyhbbmV3RGFzaF0sIFwiQ3JlYXRlZCBuZXcgZGFzaGJvYXJkOiBcIiArIHRpdGxlLCAoZGFzaGJvYXJkcykgPT4ge1xuICAgICAgICAgICAgICAvLyBsZXQncyBqdXN0IGJlIHNhZmUgYW5kIGVuc3VyZSB0aGVyZSdzIG5vIHNlbGVjdGlvbnNcbiAgICAgICAgICAgICAgZGVzZWxlY3RBbGwoKTtcbiAgICAgICAgICAgICAgc2V0U3ViVGFicyhuYXYuYnVpbGRlcigpLCBkYXNoYm9hcmRzLCAkcm9vdFNjb3BlKTtcbiAgICAgICAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICAgICAgICBtb2RhbC5kaXNtaXNzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XVxuICAgICAgfSk7XG4gICAgICAvKlxuICAgICAgdmFyIGNvdW50ZXIgPSBkYXNoYm9hcmRzKCkubGVuZ3RoICsgMTtcbiAgICAgIHZhciB0aXRsZSA9IFwiVW50aXRsZWRcIiArIGNvdW50ZXI7XG4gICAgICB2YXIgbmV3RGFzaCA9IGRhc2hib2FyZFJlcG9zaXRvcnkuY3JlYXRlRGFzaGJvYXJkKHt0aXRsZTogdGl0bGV9KTtcblxuICAgICAgZGFzaGJvYXJkUmVwb3NpdG9yeS5wdXREYXNoYm9hcmRzKFtuZXdEYXNoXSwgXCJDcmVhdGVkIG5ldyBkYXNoYm9hcmQ6IFwiICsgdGl0bGUsIChkYXNoYm9hcmRzKSA9PiB7XG4gICAgICAgIC8vIGxldCdzIGp1c3QgYmUgc2FmZSBhbmQgZW5zdXJlIHRoZXJlJ3Mgbm8gc2VsZWN0aW9uc1xuICAgICAgICBkZXNlbGVjdEFsbCgpO1xuICAgICAgICBzZXRTdWJUYWJzKG5hdi5idWlsZGVyKCksIGRhc2hib2FyZHMsICRyb290U2NvcGUpO1xuICAgICAgICBkYXNoYm9hcmRMb2FkZWQobnVsbCwgZGFzaGJvYXJkcyk7XG4gICAgICB9KTtcbiAgICAgICovXG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLmR1cGxpY2F0ZSA9ICgpID0+IHtcbiAgICAgIHZhciBuZXdEYXNoYm9hcmRzID0gW107XG4gICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiRHVwbGljYXRlZCBkYXNoYm9hcmQocykgXCI7XG4gICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMsIChpdGVtLCBpZHgpID0+IHtcbiAgICAgICAgLy8gbGV0cyB1bnNlbGVjdCB0aGlzIGl0ZW1cbiAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIkR1cGxpY2F0ZWQgZGFzaGJvYXJkIFwiICsgaXRlbS50aXRsZTtcbiAgICAgICAgdmFyIG5ld0Rhc2ggPSBkYXNoYm9hcmRSZXBvc2l0b3J5LmNsb25lRGFzaGJvYXJkKGl0ZW0pO1xuICAgICAgICBuZXdEYXNoYm9hcmRzLnB1c2gobmV3RGFzaCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gbGV0J3MganVzdCBiZSBzYWZlIGFuZCBlbnN1cmUgdGhlcmUncyBubyBzZWxlY3Rpb25zXG4gICAgICBkZXNlbGVjdEFsbCgpO1xuXG4gICAgICBjb21taXRNZXNzYWdlID0gY29tbWl0TWVzc2FnZSArIG5ld0Rhc2hib2FyZHMubWFwKChkKSA9PiB7IHJldHVybiBkLnRpdGxlIH0pLmpvaW4oJywnKTtcbiAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyhuZXdEYXNoYm9hcmRzLCBjb21taXRNZXNzYWdlLCAoZGFzaGJvYXJkcykgPT4ge1xuICAgICAgICBzZXRTdWJUYWJzKG5hdi5idWlsZGVyKCksIGRhc2hib2FyZHMsICRyb290U2NvcGUpO1xuICAgICAgICBkYXNoYm9hcmRMb2FkZWQobnVsbCwgZGFzaGJvYXJkcyk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJlbmFtZURhc2hib2FyZCA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gPGFueT5fLmZpcnN0KCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgICAgdmFyIG1vZGFsID0gJG1vZGFsLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlVXJsOiBVcmxIZWxwZXJzLmpvaW4odGVtcGxhdGVQYXRoLCAncmVuYW1lRGFzaGJvYXJkTW9kYWwuaHRtbCcpLFxuICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRtb2RhbEluc3RhbmNlJywgKCRzY29wZSwgJG1vZGFsSW5zdGFuY2UpID0+IHtcbiAgICAgICAgICAgICRzY29wZS5jb25maWcgPSB7XG4gICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAndGl0bGUnOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHNlbGVjdGVkLnRpdGxlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgICAkc2NvcGUub2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIG1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyhbJHNjb3BlLnNlbGVjdGVkXSwgJ3JlbmFtZWQgZGFzaGJvYXJkJywgKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBsZXQncyBqdXN0IGJlIHNhZmUgYW5kIGVuc3VyZSB0aGVyZSdzIG5vIHNlbGVjdGlvbnNcbiAgICAgICAgICAgICAgICBkZXNlbGVjdEFsbCgpO1xuICAgICAgICAgICAgICAgIHNldFN1YlRhYnMobmF2LmJ1aWxkZXIoKSwgZGFzaGJvYXJkcywgJHJvb3RTY29wZSk7XG4gICAgICAgICAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIG1vZGFsLmRpc21pc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZURhc2hib2FyZCA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuaGFzU2VsZWN0aW9uKCkpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICAgIHZhciBtb2RhbCA9ICRtb2RhbC5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ2RlbGV0ZURhc2hib2FyZE1vZGFsLmh0bWwnKSxcbiAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckbW9kYWxJbnN0YW5jZScsICgkc2NvcGUsICRtb2RhbEluc3RhbmNlKSA9PiB7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWQgPSBzZWxlY3RlZDtcbiAgICAgICAgICAgICRzY29wZS5vayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgbW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgICAgZGFzaGJvYXJkUmVwb3NpdG9yeS5kZWxldGVEYXNoYm9hcmRzKCRzY29wZS5zZWxlY3RlZCwgKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBsZXQncyBqdXN0IGJlIHNhZmUgYW5kIGVuc3VyZSB0aGVyZSdzIG5vIHNlbGVjdGlvbnNcbiAgICAgICAgICAgICAgICBkZXNlbGVjdEFsbCgpO1xuICAgICAgICAgICAgICAgIHNldFN1YlRhYnMobmF2LmJ1aWxkZXIoKSwgZGFzaGJvYXJkcywgJHJvb3RTY29wZSk7XG4gICAgICAgICAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIG1vZGFsLmRpc21pc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmdpc3QgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgaWQgPSAkc2NvcGUuc2VsZWN0ZWRJdGVtc1swXS5pZDtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoXCIvZGFzaGJvYXJkL2lkL1wiICsgaWQgKyBcIi9zaGFyZVwiKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgIHZhciB1cmwgPSAkcm91dGVQYXJhbXNbXCJocmVmXCJdO1xuICAgICAgaWYgKHVybCkge1xuICAgICAgICAkc2NvcGUudXJsID0gZGVjb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgICB9XG5cbiAgICAgIHZhciByb3V0ZVBhcmFtcyA9ICRyb3V0ZVBhcmFtc1tcInJvdXRlUGFyYW1zXCJdO1xuICAgICAgaWYgKHJvdXRlUGFyYW1zKSB7XG4gICAgICAgICRzY29wZS5yb3V0ZVBhcmFtcyA9IGRlY29kZVVSSUNvbXBvbmVudChyb3V0ZVBhcmFtcyk7XG4gICAgICB9XG4gICAgICB2YXIgc2l6ZTphbnkgPSAkcm91dGVQYXJhbXNbXCJzaXplXCJdO1xuICAgICAgaWYgKHNpemUpIHtcbiAgICAgICAgc2l6ZSA9IGRlY29kZVVSSUNvbXBvbmVudChzaXplKTtcbiAgICAgICAgJHNjb3BlLnByZWZlcnJlZFNpemUgPSBhbmd1bGFyLmZyb21Kc29uKHNpemUpO1xuICAgICAgfVxuICAgICAgdmFyIHRpdGxlOmFueSA9ICRyb3V0ZVBhcmFtc1tcInRpdGxlXCJdO1xuICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgIHRpdGxlID0gZGVjb2RlVVJJQ29tcG9uZW50KHRpdGxlKTtcbiAgICAgICAgJHNjb3BlLndpZGdldFRpdGxlID0gdGl0bGU7XG4gICAgICB9XG5cbiAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkcygoZGFzaGJvYXJkcykgPT4ge1xuICAgICAgICBkYXNoYm9hcmRMb2FkZWQobnVsbCwgZGFzaGJvYXJkcyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXNoYm9hcmRMb2FkZWQoZXZlbnQsIGRhc2hib2FyZHMpIHtcbiAgICAgIGRhc2hib2FyZHMuZm9yRWFjaCgoZGFzaGJvYXJkKSA9PiB7XG4gICAgICAgIGRhc2hib2FyZC5oYXNoID0gJz9tYWluLXRhYj1kYXNoYm9hcmQmc3ViLXRhYj1kYXNoYm9hcmQtJyArIGRhc2hib2FyZC5pZDtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLl9kYXNoYm9hcmRzID0gZGFzaGJvYXJkcztcblxuICAgICAgaWYgKGV2ZW50ID09PSBudWxsKSB7XG4gICAgICAgICRzY29wZS4kZW1pdCgnZGFzaGJvYXJkc1VwZGF0ZWQnLCBkYXNoYm9hcmRzKTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRyb290U2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRhc2hib2FyZHMoKSB7XG4gICAgICByZXR1cm4gJHNjb3BlLl9kYXNoYm9hcmRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlc2VsZWN0QWxsKCkge1xuICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoID0gMDtcbiAgICB9XG5cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cImRhc2hib2FyZEhlbHBlcnMudHNcIi8+XG4vKipcbiAqIEBtb2R1bGUgRGFzaGJvYXJkXG4gKi9cbm1vZHVsZSBEYXNoYm9hcmQge1xuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRzIHRoZSBuZy5JTG9jYXRpb25TZXJ2aWNlIGludGVyZmFjZSBhbmQgaXMgdXNlZCBieSB0aGUgZGFzaGJvYXJkIHRvIHN1cHBseVxuICAgKiBjb250cm9sbGVycyB3aXRoIGEgc2F2ZWQgVVJMIGxvY2F0aW9uXG4gICAqXG4gICAqIEBjbGFzcyBSZWN0YW5nbGVMb2NhdGlvblxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIFJlY3RhbmdsZUxvY2F0aW9uIHsgLy8gVE9ETyBpbXBsZW1lbnRzIG5nLklMb2NhdGlvblNlcnZpY2Uge1xuICAgIHByaXZhdGUgX3BhdGg6IHN0cmluZztcbiAgICBwcml2YXRlIF9oYXNoOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfc2VhcmNoOiBhbnk7XG4gICAgcHJpdmF0ZSB1cmk6VVJJO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIGRlbGVnYXRlOm5nLklMb2NhdGlvblNlcnZpY2UsIHBhdGg6c3RyaW5nLCBzZWFyY2gsIGhhc2g6c3RyaW5nKSB7XG4gICAgICB0aGlzLl9wYXRoID0gcGF0aDtcbiAgICAgIHRoaXMuX3NlYXJjaCA9IHNlYXJjaDtcbiAgICAgIHRoaXMuX2hhc2ggPSBoYXNoO1xuICAgICAgdGhpcy51cmkgPSBuZXcgVVJJKHBhdGgpO1xuICAgICAgdGhpcy51cmkuc2VhcmNoKChxdWVyeSkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VhcmNoO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgYWJzVXJsKCkge1xuICAgICAgcmV0dXJuIHRoaXMucHJvdG9jb2woKSArIHRoaXMuaG9zdCgpICsgXCI6XCIgKyB0aGlzLnBvcnQoKSArIHRoaXMucGF0aCgpICsgdGhpcy5zZWFyY2goKTtcbiAgICB9XG5cbiAgICBoYXNoKG5ld0hhc2g6c3RyaW5nID0gbnVsbCk6YW55IHtcbiAgICAgIGlmIChuZXdIYXNoKSB7XG4gICAgICAgIHRoaXMudXJpLnNlYXJjaChuZXdIYXNoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5faGFzaDtcbiAgICB9XG5cbiAgICBob3N0KCk6c3RyaW5nIHtcbiAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmhvc3QoKTtcbiAgICB9XG5cbiAgICBwYXRoKG5ld1BhdGg6c3RyaW5nID0gbnVsbCk6YW55IHtcbiAgICAgIGlmIChuZXdQYXRoKSB7XG4gICAgICAgIHRoaXMudXJpLnBhdGgobmV3UGF0aCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX3BhdGg7XG4gICAgfVxuXG4gICAgcG9ydCgpOm51bWJlciB7XG4gICAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5wb3J0KCk7XG4gICAgfVxuXG4gICAgcHJvdG9jb2woKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5wb3J0KCk7XG4gICAgfVxuXG4gICAgcmVwbGFjZSgpIHtcbiAgICAgIC8vIFRPRE9cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHNlYXJjaChwYXJhbWV0ZXJzTWFwOmFueSA9IG51bGwpOmFueSB7XG4gICAgICBpZiAocGFyYW1ldGVyc01hcCkge1xuICAgICAgICB0aGlzLnVyaS5zZWFyY2gocGFyYW1ldGVyc01hcCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX3NlYXJjaDtcbiAgICB9XG5cbiAgICB1cmwobmV3VmFsdWU6IHN0cmluZyA9IG51bGwpOmFueSB7XG4gICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy51cmkgPSBuZXcgVVJJKG5ld1ZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5hYnNVcmwoKTtcbiAgICB9XG5cbiAgfVxufVxuIiwiLyoqXG4gKiBAbW9kdWxlIERhc2hib2FyZFxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkUGx1Z2luLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImRhc2hib2FyZFJlcG9zaXRvcnkudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwicmVjdGFuZ2xlTG9jYXRpb24udHNcIi8+XG5tb2R1bGUgRGFzaGJvYXJkIHtcblxuICB2YXIgbW9kdWxlczpBcnJheTxzdHJpbmc+ID0gdW5kZWZpbmVkO1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCdoYXd0aW9EYXNoYm9hcmQnLCBmdW5jdGlvbigpIHtcbiAgICBtb2R1bGVzID0gaGF3dGlvUGx1Z2luTG9hZGVyWydtb2R1bGVzJ10uZmlsdGVyKChuYW1lKSA9PiB7XG4gICAgICByZXR1cm4gXy5pc1N0cmluZyhuYW1lKSAmJiBuYW1lICE9PSAnbmcnO1xuICAgIH0pO1xuICAgIHJldHVybiBuZXcgRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlKCk7XG4gIH0pO1xuXG4gIGV4cG9ydCBjbGFzcyBHcmlkc3RlckRpcmVjdGl2ZSB7XG4gICAgcHVibGljIHJlc3RyaWN0ID0gJ0EnO1xuICAgIHB1YmxpYyByZXBsYWNlID0gdHJ1ZTtcblxuICAgIHB1YmxpYyBjb250cm9sbGVyID0gW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkYXR0cnNcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImRhc2hib2FyZFJlcG9zaXRvcnlcIiwgXCIkY29tcGlsZVwiLCBcIiR0ZW1wbGF0ZVJlcXVlc3RcIiwgXCIkaW50ZXJwb2xhdGVcIiwgXCIkbW9kYWxcIiwgXCIkc2NlXCIsICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgZGFzaGJvYXJkUmVwb3NpdG9yeTpEYXNoYm9hcmRSZXBvc2l0b3J5LCAkY29tcGlsZSwgJHRlbXBsYXRlUmVxdWVzdCwgJGludGVycG9sYXRlLCAkbW9kYWwsICRzY2UpID0+IHtcblxuICAgICAgdmFyIGdyaWRTaXplID0gMTUwO1xuICAgICAgdmFyIGdyaWRNYXJnaW4gPSA2O1xuICAgICAgdmFyIGdyaWRIZWlnaHQ7XG5cbiAgICAgICRzY29wZS5ncmlkWCA9IGdyaWRTaXplO1xuICAgICAgJHNjb3BlLmdyaWRZID0gZ3JpZFNpemU7XG5cbiAgICAgICRzY29wZS53aWRnZXRNYXAgPSB7fTtcblxuICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUud2lkZ2V0TWFwLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgIGlmICgnc2NvcGUnIGluIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgc2NvcGUgPSB2YWx1ZVsnc2NvcGUnXTtcbiAgICAgICAgICAgIHNjb3BlLiRkZXN0cm95KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVdpZGdldHMsIDEwKTtcblxuICAgICAgZnVuY3Rpb24gcmVtb3ZlV2lkZ2V0KHdpZGdldCkge1xuICAgICAgICB2YXIgZ3JpZHN0ZXIgPSBnZXRHcmlkc3RlcigpO1xuICAgICAgICB2YXIgd2lkZ2V0RWxlbSA9IG51bGw7XG5cbiAgICAgICAgLy8gbGV0cyBkZXN0cm95IHRoZSB3aWRnZXRzJ3Mgc2NvcGVcbiAgICAgICAgdmFyIHdpZGdldERhdGEgPSAkc2NvcGUud2lkZ2V0TWFwW3dpZGdldC5pZF07XG4gICAgICAgIGlmICh3aWRnZXREYXRhKSB7XG4gICAgICAgICAgZGVsZXRlICRzY29wZS53aWRnZXRNYXBbd2lkZ2V0LmlkXTtcbiAgICAgICAgICB3aWRnZXRFbGVtID0gd2lkZ2V0RGF0YS53aWRnZXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF3aWRnZXRFbGVtKSB7XG4gICAgICAgICAgLy8gbGV0cyBnZXQgdGhlIGxpIHBhcmVudCBlbGVtZW50IG9mIHRoZSB0ZW1wbGF0ZVxuICAgICAgICAgIHdpZGdldEVsZW0gPSAkKFwiZGl2XCIpLmZpbmQoXCJbZGF0YS13aWRnZXRJZD0nXCIgKyB3aWRnZXQuaWQgKyBcIiddXCIpLnBhcmVudCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChncmlkc3RlciAmJiB3aWRnZXRFbGVtKSB7XG4gICAgICAgICAgZ3JpZHN0ZXIucmVtb3ZlX3dpZGdldCh3aWRnZXRFbGVtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBsZXRzIHRyYXNoIHRoZSBKU09OIG1ldGFkYXRhXG4gICAgICAgIGlmICgkc2NvcGUuZGFzaGJvYXJkKSB7XG4gICAgICAgICAgdmFyIHdpZGdldHMgPSAkc2NvcGUuZGFzaGJvYXJkLndpZGdldHM7XG4gICAgICAgICAgaWYgKHdpZGdldHMpIHtcbiAgICAgICAgICAgIHdpZGdldHMucmVtb3ZlKHdpZGdldCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlRGFzaGJvYXJkUmVwb3NpdG9yeShcIlJlbW92ZWQgd2lkZ2V0IFwiICsgd2lkZ2V0LnRpdGxlKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGNoYW5nZVdpZGdldFNpemUod2lkZ2V0LCBzaXplZnVuYywgc2F2ZWZ1bmMpIHtcbiAgICAgICAgaWYgKCF3aWRnZXQpIHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJ3aWRnZXQgdW5kZWZpbmVkXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZ3JpZHN0ZXIgPSBnZXRHcmlkc3RlcigpO1xuICAgICAgICBsb2cuZGVidWcoXCJXaWRnZXQgSUQ6IFwiLCB3aWRnZXQuaWQsIFwiIHdpZGdldE1hcDogXCIsICRzY29wZS53aWRnZXRNYXApO1xuICAgICAgICB2YXIgZW50cnkgPSAkc2NvcGUud2lkZ2V0TWFwW3dpZGdldC5pZF07XG4gICAgICAgIHZhciB3ID0gZW50cnkud2lkZ2V0O1xuICAgICAgICBzaXplZnVuYyhlbnRyeSk7XG4gICAgICAgIGdyaWRzdGVyLnJlc2l6ZV93aWRnZXQodywgZW50cnkuc2l6ZV94LCBlbnRyeS5zaXplX3kpO1xuICAgICAgICBncmlkc3Rlci5zZXRfZG9tX2dyaWRfaGVpZ2h0KCk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2F2ZWZ1bmMod2lkZ2V0KTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvbldpZGdldFJlbmFtZWQod2lkZ2V0KSB7XG4gICAgICAgIHVwZGF0ZURhc2hib2FyZFJlcG9zaXRvcnkoXCJSZW5hbWVkIHdpZGdldCB0byBcIiArIHdpZGdldC50aXRsZSk7XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVXaWRnZXRzKCkge1xuICAgICAgICAkc2NvcGUuaWQgPSAkcm91dGVQYXJhbXNbXCJkYXNoYm9hcmRJZFwiXTtcbiAgICAgICAgJHNjb3BlLmlkeCA9ICRyb3V0ZVBhcmFtc1tcImRhc2hib2FyZEluZGV4XCJdO1xuICAgICAgICBpZiAoJHNjb3BlLmlkKSB7XG4gICAgICAgICAgJHNjb3BlLiRlbWl0KCdsb2FkRGFzaGJvYXJkcycpO1xuICAgICAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkKCRzY29wZS5pZCwgb25EYXNoYm9hcmRMb2FkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LmdldERhc2hib2FyZHMoKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgICAgICRzY29wZS4kZW1pdCgnZGFzaGJvYXJkc1VwZGF0ZWQnLCBkYXNoYm9hcmRzKTtcblxuICAgICAgICAgICAgdmFyIGlkeCA9ICRzY29wZS5pZHggPyBwYXJzZUludCgkc2NvcGUuaWR4KSA6IDA7XG4gICAgICAgICAgICB2YXIgaWQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGRhc2hib2FyZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICB2YXIgZGFzaGJvYXJkID0gZGFzaGJvYXJkcy5sZW5ndGggPiBpZHggPyBkYXNoYm9hcmRzW2lkeF0gOiBkYXNoYm9hcmRbMF07XG4gICAgICAgICAgICAgIGlkID0gZGFzaGJvYXJkLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKFwiL2Rhc2hib2FyZC9pZC9cIiArIGlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKFwiL2Rhc2hib2FyZC9lZGl0XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvbkRhc2hib2FyZExvYWQoZGFzaGJvYXJkKSB7XG4gICAgICAgICRzY29wZS5kYXNoYm9hcmQgPSBkYXNoYm9hcmQ7XG4gICAgICAgIHZhciB3aWRnZXRzID0gKChkYXNoYm9hcmQpID8gZGFzaGJvYXJkLndpZGdldHMgOiBudWxsKSB8fCBbXTtcblxuICAgICAgICB2YXIgbWluSGVpZ2h0ID0gMTA7XG4gICAgICAgIHZhciBtaW5XaWR0aCA9IDY7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpZGdldHMsICh3aWRnZXQpID0+IHtcbiAgICAgICAgICBpZiAoIXdpZGdldCkge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiVW5kZWZpbmVkIHdpZGdldCwgc2tpcHBpbmdcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZCh3aWRnZXQucm93KSAmJiBtaW5IZWlnaHQgPCB3aWRnZXQucm93KSB7XG4gICAgICAgICAgICBtaW5IZWlnaHQgPSB3aWRnZXQucm93ICsgMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHdpZGdldC5zaXplX3hcbiAgICAgICAgICAgICAgJiYgYW5ndWxhci5pc0RlZmluZWQod2lkZ2V0LmNvbCkpKSB7XG4gICAgICAgICAgICB2YXIgcmlnaHRFZGdlID0gd2lkZ2V0LmNvbCArIHdpZGdldC5zaXplX3g7XG4gICAgICAgICAgICBpZiAocmlnaHRFZGdlID4gbWluV2lkdGgpIHtcbiAgICAgICAgICAgICAgbWluV2lkdGggPSByaWdodEVkZ2UgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGdyaWRzdGVyID0gJGVsZW1lbnQuZ3JpZHN0ZXIoe1xuICAgICAgICAgIHdpZGdldF9tYXJnaW5zOiBbZ3JpZE1hcmdpbiwgZ3JpZE1hcmdpbl0sXG4gICAgICAgICAgd2lkZ2V0X2Jhc2VfZGltZW5zaW9uczogWyRzY29wZS5ncmlkWCwgJHNjb3BlLmdyaWRZXSxcbiAgICAgICAgICBleHRyYV9yb3dzOiBtaW5IZWlnaHQsXG4gICAgICAgICAgZXh0cmFfY29sczogbWluV2lkdGgsXG4gICAgICAgICAgbWF4X3NpemVfeDogbWluV2lkdGgsXG4gICAgICAgICAgbWF4X3NpemVfeTogbWluSGVpZ2h0LFxuICAgICAgICAgIGRyYWdnYWJsZToge1xuICAgICAgICAgICAgc3RvcDogKGV2ZW50LCB1aSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoc2VyaWFsaXplRGFzaGJvYXJkKCkpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVEYXNoYm9hcmRSZXBvc2l0b3J5KFwiQ2hhbmdpbmcgZGFzaGJvYXJkIGxheW91dFwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSkuZGF0YSgnZ3JpZHN0ZXInKTtcblxuICAgICAgICB2YXIgdGVtcGxhdGUgPSAkdGVtcGxhdGVDYWNoZS5nZXQoXCJ3aWRnZXRUZW1wbGF0ZVwiKTtcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IHdpZGdldHMubGVuZ3RoO1xuXG4gICAgICAgIGZ1bmN0aW9uIG1heWJlRmluaXNoVXAoKSB7XG4gICAgICAgICAgcmVtYWluaW5nID0gcmVtYWluaW5nIC0gMTtcbiAgICAgICAgICBpZiAocmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICBtYWtlUmVzaXphYmxlKCk7XG4gICAgICAgICAgICBnZXRHcmlkc3RlcigpLmVuYWJsZSgpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkb1JlbW92ZVdpZGdldCgkbW9kYWwsIHdpZGdldCkge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIlJlbW92ZSB3aWRnZXQ6IFwiLCB3aWRnZXQpO1xuICAgICAgICAgIHZhciBtb2RhbCA9ICRtb2RhbC5vcGVuKHtcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBVcmxIZWxwZXJzLmpvaW4odGVtcGxhdGVQYXRoLCAnZGVsZXRlV2lkZ2V0TW9kYWwuaHRtbCcpLFxuICAgICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJG1vZGFsSW5zdGFuY2UnLCAoJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSkgPT4ge1xuICAgICAgICAgICAgICAkc2NvcGUud2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICAgICAgICAkc2NvcGUub2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICByZW1vdmVXaWRnZXQoJHNjb3BlLndpZGdldCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBtb2RhbC5kaXNtaXNzKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1dXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkb1JlbmFtZVdpZGdldCgkbW9kYWwsIHdpZGdldCkge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIlJlbmFtZSB3aWRnZXQ6IFwiLCB3aWRnZXQpO1xuICAgICAgICAgIHZhciBtb2RhbCA9ICRtb2RhbC5vcGVuKHtcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBVcmxIZWxwZXJzLmpvaW4odGVtcGxhdGVQYXRoLCAncmVuYW1lV2lkZ2V0TW9kYWwuaHRtbCcpLFxuICAgICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJG1vZGFsSW5zdGFuY2UnLCAoJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSkgPT4ge1xuICAgICAgICAgICAgICAkc2NvcGUud2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICAgICAgICAkc2NvcGUuY29uZmlnID0ge1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICd0aXRsZSc6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHdpZGdldC50aXRsZVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgJHNjb3BlLm9rID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgb25XaWRnZXRSZW5hbWVkKCRzY29wZS53aWRnZXQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbW9kYWwuZGlzbWlzcygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpZGdldHMsICh3aWRnZXQpID0+IHtcbiAgICAgICAgICB2YXIgdHlwZSA9ICdpbnRlcm5hbCc7XG4gICAgICAgICAgaWYgKCdpZnJhbWUnIGluIHdpZGdldCkge1xuICAgICAgICAgICAgdHlwZSA9ICdleHRlcm5hbCc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnZXh0ZXJuYWwnOlxuICAgICAgICAgICAgICB2YXIgc2NvcGUgPSAkc2NvcGUuJG5ldygpO1xuICAgICAgICAgICAgICBzY29wZS53aWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICAgIHNjb3BlLnJlbW92ZVdpZGdldCA9ICh3aWRnZXQpID0+IGRvUmVtb3ZlV2lkZ2V0KCRtb2RhbCwgd2lkZ2V0KTtcbiAgICAgICAgICAgICAgc2NvcGUucmVuYW1lV2lkZ2V0ID0gKHdpZGdldCkgPT4gZG9SZW5hbWVXaWRnZXQoJG1vZGFsLCB3aWRnZXQpO1xuICAgICAgICAgICAgICB2YXIgd2lkZ2V0Qm9keTphbnkgPSBhbmd1bGFyLmVsZW1lbnQoJHRlbXBsYXRlQ2FjaGUuZ2V0KCdpZnJhbWVXaWRnZXRUZW1wbGF0ZS5odG1sJykpO1xuICAgICAgICAgICAgICB2YXIgb3V0ZXJEaXYgPSBhbmd1bGFyLmVsZW1lbnQoJHRlbXBsYXRlQ2FjaGUuZ2V0KCd3aWRnZXRCbG9ja1RlbXBsYXRlLmh0bWwnKSk7XG4gICAgICAgICAgICAgIHdpZGdldEJvZHkuZmluZCgnaWZyYW1lJykuYXR0cignc3JjJywgd2lkZ2V0LmlmcmFtZSk7XG4gICAgICAgICAgICAgIG91dGVyRGl2LmFwcGVuZCgkY29tcGlsZSh3aWRnZXRCb2R5KShzY29wZSkpO1xuICAgICAgICAgICAgICB2YXIgdyA9IGdyaWRzdGVyLmFkZF93aWRnZXQob3V0ZXJEaXYsIHdpZGdldC5zaXplX3gsIHdpZGdldC5zaXplX3ksIHdpZGdldC5jb2wsIHdpZGdldC5yb3cpO1xuICAgICAgICAgICAgICAkc2NvcGUud2lkZ2V0TWFwW3dpZGdldC5pZF0gPSB7XG4gICAgICAgICAgICAgICAgd2lkZ2V0OiB3XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIG1heWJlRmluaXNoVXAoKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpbnRlcm5hbCc6IFxuICAgICAgICAgICAgICB2YXIgcGF0aCA9IHdpZGdldC5wYXRoO1xuICAgICAgICAgICAgICB2YXIgc2VhcmNoID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHdpZGdldC5zZWFyY2gpIHtcbiAgICAgICAgICAgICAgICBzZWFyY2ggPSBEYXNoYm9hcmQuZGVjb2RlVVJJQ29tcG9uZW50UHJvcGVydGllcyh3aWRnZXQuc2VhcmNoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAod2lkZ2V0LnJvdXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgXy5leHRlbmQoc2VhcmNoLCBhbmd1bGFyLmZyb21Kc29uKHdpZGdldC5yb3V0ZVBhcmFtcykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhciBoYXNoID0gd2lkZ2V0Lmhhc2g7IC8vIFRPRE8gZGVjb2RlIG9iamVjdD9cbiAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gbmV3IFJlY3RhbmdsZUxvY2F0aW9uKCRsb2NhdGlvbiwgcGF0aCwgc2VhcmNoLCBoYXNoKTtcbiAgICAgICAgICAgICAgaWYgKCF3aWRnZXQuc2l6ZV94IHx8IHdpZGdldC5zaXplX3ggPCAxKSB7XG4gICAgICAgICAgICAgICAgd2lkZ2V0LnNpemVfeCA9IDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCF3aWRnZXQuc2l6ZV95IHx8IHdpZGdldC5zaXplX3kgPCAxKSB7XG4gICAgICAgICAgICAgICAgd2lkZ2V0LnNpemVfeSA9IDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIHRtcE1vZHVsZU5hbWUgPSAnZGFzaGJvYXJkLScgKyB3aWRnZXQuaWQ7XG4gICAgICAgICAgICAgIHZhciB0bXBNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSh0bXBNb2R1bGVOYW1lLCBtb2R1bGVzKTtcbiAgICAgICAgICAgICAgdG1wTW9kdWxlLmNvbmZpZyhbJyRwcm92aWRlJywgKCRwcm92aWRlKSA9PiB7XG4gICAgICAgICAgICAgICAgJHByb3ZpZGUuZGVjb3JhdG9yKCdIYXd0aW9EYXNoYm9hcmQnLCBbJyRkZWxlZ2F0ZScsICckcm9vdFNjb3BlJywgKCRkZWxlZ2F0ZSwgJHJvb3RTY29wZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgJGRlbGVnYXRlLmluRGFzaGJvYXJkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiAkZGVsZWdhdGU7XG4gICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICAgICRwcm92aWRlLmRlY29yYXRvcignJGxvY2F0aW9uJywgWyckZGVsZWdhdGUnLCAoJGRlbGVnYXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAvL2xvZy5kZWJ1ZyhcIlVzaW5nICRsb2NhdGlvbjogXCIsIGxvY2F0aW9uKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbjtcbiAgICAgICAgICAgICAgICB9XSk7XG4gICAgICAgICAgICAgICAgJHByb3ZpZGUuZGVjb3JhdG9yKCckcm91dGUnLCBbJyRkZWxlZ2F0ZScsICgkZGVsZWdhdGUpID0+IHtcbiAgICAgICAgICAgICAgICAgIC8vIHJlYWxseSBoYW5keSBmb3IgZGVidWdnaW5nLCBtb3N0bHkgdG8gdGVsbCBpZiBhIHdpZGdldCdzIHJvdXRlXG4gICAgICAgICAgICAgICAgICAvLyBpc24ndCBhY3R1YWxseSBhdmFpbGFibGUgaW4gdGhlIGNoaWxkIGFwcFxuICAgICAgICAgICAgICAgICAgLy9sb2cuZGVidWcoXCJVc2luZyAkcm91dGU6IFwiLCAkZGVsZWdhdGUpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuICRkZWxlZ2F0ZTtcbiAgICAgICAgICAgICAgICB9XSk7XG4gICAgICAgICAgICAgICAgJHByb3ZpZGUuZGVjb3JhdG9yKCckcm91dGVQYXJhbXMnLCBbJyRkZWxlZ2F0ZScsICgkZGVsZWdhdGUpID0+IHtcbiAgICAgICAgICAgICAgICAgIC8vbG9nLmRlYnVnKFwiVXNpbmcgJHJvdXRlUGFyYW1zOiBcIiwgc2VhcmNoKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBzZWFyY2g7XG4gICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICB9XSk7XG4gICAgICAgICAgICAgIHRtcE1vZHVsZS5jb250cm9sbGVyKCdIYXd0aW9EYXNoYm9hcmQuVGl0bGUnLCBbXCIkc2NvcGVcIiwgXCIkbW9kYWxcIiwgKCRzY29wZSwgJG1vZGFsKSA9PiB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVtb3ZlV2lkZ2V0ID0gKHdpZGdldCkgPT4gZG9SZW1vdmVXaWRnZXQoJG1vZGFsLCB3aWRnZXQpO1xuICAgICAgICAgICAgICAgICRzY29wZS5yZW5hbWVXaWRnZXQgPSAod2lkZ2V0KSA9PiBkb1JlbmFtZVdpZGdldCgkbW9kYWwsIHdpZGdldCk7XG4gICAgICAgICAgICAgIH1dKTtcblxuICAgICAgICAgICAgICB2YXIgZGl2OmFueSA9ICQodGVtcGxhdGUpO1xuICAgICAgICAgICAgICBkaXYuYXR0cih7ICdkYXRhLXdpZGdldElkJzogd2lkZ2V0LmlkIH0pO1xuICAgICAgICAgICAgICB2YXIgYm9keSA9IGRpdi5maW5kKCcud2lkZ2V0LWJvZHknKTtcbiAgICAgICAgICAgICAgdmFyIHdpZGdldEJvZHkgPSAkdGVtcGxhdGVSZXF1ZXN0KHdpZGdldC5pbmNsdWRlKTtcbiAgICAgICAgICAgICAgd2lkZ2V0Qm9keS50aGVuKCh3aWRnZXRCb2R5KSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIG91dGVyRGl2ID0gYW5ndWxhci5lbGVtZW50KCR0ZW1wbGF0ZUNhY2hlLmdldCgnd2lkZ2V0QmxvY2tUZW1wbGF0ZS5odG1sJykpO1xuICAgICAgICAgICAgICAgIGJvZHkuaHRtbCh3aWRnZXRCb2R5KTtcbiAgICAgICAgICAgICAgICBvdXRlckRpdi5odG1sKGRpdik7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5ib290c3RyYXAoZGl2LCBbdG1wTW9kdWxlTmFtZV0pO1xuICAgICAgICAgICAgICAgIHZhciB3ID0gZ3JpZHN0ZXIuYWRkX3dpZGdldChvdXRlckRpdiwgd2lkZ2V0LnNpemVfeCwgd2lkZ2V0LnNpemVfeSwgd2lkZ2V0LmNvbCwgd2lkZ2V0LnJvdyk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndpZGdldE1hcFt3aWRnZXQuaWRdID0ge1xuICAgICAgICAgICAgICAgICAgd2lkZ2V0OiB3XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXliZUZpbmlzaFVwKCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZXJpYWxpemVEYXNoYm9hcmQoKSB7XG4gICAgICAgIHZhciBncmlkc3RlciA9IGdldEdyaWRzdGVyKCk7XG4gICAgICAgIGlmIChncmlkc3Rlcikge1xuICAgICAgICAgIHZhciBkYXRhID0gZ3JpZHN0ZXIuc2VyaWFsaXplKCk7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcImdvdCBkYXRhOiBcIiArIEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcblxuICAgICAgICAgIHZhciB3aWRnZXRzID0gJHNjb3BlLmRhc2hib2FyZC53aWRnZXRzIHx8IFtdO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiV2lkZ2V0czogXCIsIHdpZGdldHMpO1xuXG4gICAgICAgICAgLy8gbGV0cyBhc3N1bWUgdGhlIGRhdGEgaXMgaW4gdGhlIG9yZGVyIG9mIHRoZSB3aWRnZXRzLi4uXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpZGdldHMsICh3aWRnZXQsIGlkeCkgPT4ge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gZGF0YVtpZHhdO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHdpZGdldCkge1xuICAgICAgICAgICAgICAvLyBsZXRzIGNvcHkgdGhlIHZhbHVlcyBhY3Jvc3NcbiAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHZhbHVlLCAoYXR0ciwga2V5KSA9PiB3aWRnZXRba2V5XSA9IGF0dHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gbWFrZVJlc2l6YWJsZSgpIHtcbiAgICAgICAgdmFyIGJsb2NrczphbnkgPSAkKCcuZ3JpZC1ibG9jaycpO1xuICAgICAgICBibG9ja3MucmVzaXphYmxlKCdkZXN0cm95Jyk7XG5cbiAgICAgICAgYmxvY2tzLnJlc2l6YWJsZSh7XG4gICAgICAgICAgZ3JpZDogW2dyaWRTaXplICsgKGdyaWRNYXJnaW4gKiAyKSwgZ3JpZFNpemUgKyAoZ3JpZE1hcmdpbiAqIDIpXSxcbiAgICAgICAgICBhbmltYXRlOiBmYWxzZSxcbiAgICAgICAgICBtaW5XaWR0aDogZ3JpZFNpemUsXG4gICAgICAgICAgbWluSGVpZ2h0OiBncmlkU2l6ZSxcbiAgICAgICAgICBhdXRvSGlkZTogZmFsc2UsXG4gICAgICAgICAgc3RhcnQ6IGZ1bmN0aW9uKGV2ZW50LCB1aSkge1xuICAgICAgICAgICAgZ3JpZEhlaWdodCA9IGdldEdyaWRzdGVyKCkuJGVsLmhlaWdodCgpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVzaXplOiBmdW5jdGlvbihldmVudCwgdWkpIHtcbiAgICAgICAgICAgIC8vc2V0IG5ldyBncmlkIGhlaWdodCBhbG9uZyB0aGUgZHJhZ2dpbmcgcGVyaW9kXG4gICAgICAgICAgICB2YXIgZyA9IGdldEdyaWRzdGVyKCk7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSBncmlkU2l6ZSArIGdyaWRNYXJnaW4gKiAyO1xuICAgICAgICAgICAgaWYgKGV2ZW50Lm9mZnNldFkgPiBnLiRlbC5oZWlnaHQoKSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdmFyIGV4dHJhID0gTWF0aC5mbG9vcigoZXZlbnQub2Zmc2V0WSAtIGdyaWRIZWlnaHQpIC8gZGVsdGEgKyAxKTtcbiAgICAgICAgICAgICAgdmFyIG5ld0hlaWdodCA9IGdyaWRIZWlnaHQgKyBleHRyYSAqIGRlbHRhO1xuICAgICAgICAgICAgICBnLiRlbC5jc3MoJ2hlaWdodCcsIG5ld0hlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdG9wOiBmdW5jdGlvbihldmVudCwgdWkpIHtcbiAgICAgICAgICAgIHZhciByZXNpemVkID0gJCh0aGlzKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJlc2l6ZUJsb2NrKHJlc2l6ZWQpO1xuICAgICAgICAgICAgfSwgMzAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJy51aS1yZXNpemFibGUtaGFuZGxlJykuaG92ZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZ2V0R3JpZHN0ZXIoKS5kaXNhYmxlKCk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGdldEdyaWRzdGVyKCkuZW5hYmxlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICB9XG5cblxuICAgICAgZnVuY3Rpb24gcmVzaXplQmxvY2soZWxtT2JqKSB7XG4gICAgICAgIHZhciBhcmVhID0gZWxtT2JqLmZpbmQoJy53aWRnZXQtYXJlYScpO1xuICAgICAgICB2YXIgdyA9IGVsbU9iai53aWR0aCgpIC0gZ3JpZFNpemU7XG4gICAgICAgIHZhciBoID0gZWxtT2JqLmhlaWdodCgpIC0gZ3JpZFNpemU7XG5cbiAgICAgICAgZm9yICh2YXIgZ3JpZF93ID0gMTsgdyA+IDA7IHcgLT0gKGdyaWRTaXplICsgKGdyaWRNYXJnaW4gKiAyKSkpIHtcbiAgICAgICAgICBncmlkX3crKztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGdyaWRfaCA9IDE7IGggPiAwOyBoIC09IChncmlkU2l6ZSArIChncmlkTWFyZ2luICogMikpKSB7XG4gICAgICAgICAgZ3JpZF9oKys7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd2lkZ2V0ID0ge1xuICAgICAgICAgIGlkOiBhcmVhLmF0dHIoJ2RhdGEtd2lkZ2V0SWQnKVxuICAgICAgICB9O1xuXG4gICAgICAgIGNoYW5nZVdpZGdldFNpemUod2lkZ2V0LCBmdW5jdGlvbih3aWRnZXQpIHtcbiAgICAgICAgICB3aWRnZXQuc2l6ZV94ID0gZ3JpZF93O1xuICAgICAgICAgIHdpZGdldC5zaXplX3kgPSBncmlkX2g7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHdpZGdldCkge1xuICAgICAgICAgIGlmIChzZXJpYWxpemVEYXNoYm9hcmQoKSkge1xuICAgICAgICAgICAgdXBkYXRlRGFzaGJvYXJkUmVwb3NpdG9yeShcIkNoYW5nZWQgc2l6ZSBvZiB3aWRnZXQ6IFwiICsgd2lkZ2V0LmlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhc2hib2FyZFJlcG9zaXRvcnkobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgICAgIGlmICgkc2NvcGUuZGFzaGJvYXJkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICAgIGlmICgkc2NvcGUuZGFzaGJvYXJkICYmICRzY29wZS5kYXNoYm9hcmQudGl0bGUpIHtcbiAgICAgICAgICAgIGNvbW1pdE1lc3NhZ2UgKz0gXCIgb24gZGFzaGJvYXJkIFwiICsgJHNjb3BlLmRhc2hib2FyZC50aXRsZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGFzaGJvYXJkUmVwb3NpdG9yeS5wdXREYXNoYm9hcmRzKFskc2NvcGUuZGFzaGJvYXJkXSwgY29tbWl0TWVzc2FnZSwgRGFzaGJvYXJkLm9uT3BlcmF0aW9uQ29tcGxldGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldEdyaWRzdGVyKCkge1xuICAgICAgICByZXR1cm4gJGVsZW1lbnQuZ3JpZHN0ZXIoKS5kYXRhKCdncmlkc3RlcicpO1xuICAgICAgfVxuXG4gICAgfV07XG5cbiAgfVxuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkUGx1Z2luLnRzXCIvPlxuLyoqXG4gKiBAbW9kdWxlIERhc2hib2FyZFxuICovXG5tb2R1bGUgRGFzaGJvYXJkIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiRGFzaGJvYXJkLkltcG9ydENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiZGFzaGJvYXJkUmVwb3NpdG9yeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgZGFzaGJvYXJkUmVwb3NpdG9yeTpEYXNoYm9hcmRSZXBvc2l0b3J5KSA9PiB7XG4gICAgJHNjb3BlLnBsYWNlaG9sZGVyID0gXCJQYXN0ZSB0aGUgSlNPTiBoZXJlIGZvciB0aGUgZGFzaGJvYXJkIGNvbmZpZ3VyYXRpb24gdG8gaW1wb3J0Li4uXCI7XG4gICAgJHNjb3BlLnNvdXJjZSA9ICRzY29wZS5wbGFjZWhvbGRlcjtcblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiBcImphdmFzY3JpcHRcIlxuICAgICAgfVxuICAgIH07XG4gICAgLy8kc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG5cbiAgICAkc2NvcGUuaXNWYWxpZCA9ICgpID0+ICRzY29wZS5zb3VyY2UgJiYgJHNjb3BlLnNvdXJjZSAhPT0gJHNjb3BlLnBsYWNlaG9sZGVyO1xuXG4gICAgJHNjb3BlLmltcG9ydEpTT04gPSAoKSA9PiB7XG4gICAgICB2YXIganNvbiA9IFtdO1xuICAgICAgLy8gbGV0cyBwYXJzZSB0aGUgSlNPTi4uLlxuICAgICAgdHJ5IHtcbiAgICAgICAganNvbiA9IEpTT04ucGFyc2UoJHNjb3BlLnNvdXJjZSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vSGF3dGlvQ29yZS5ub3RpZmljYXRpb24oXCJlcnJvclwiLCBcIkNvdWxkIG5vdCBwYXJzZSB0aGUgSlNPTlxcblwiICsgZSk7XG4gICAgICAgIGpzb24gPSBbXTtcbiAgICAgIH1cbiAgICAgIHZhciBhcnJheSA9IFtdO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShqc29uKSkge1xuICAgICAgICBhcnJheSA9IGpzb247XG4gICAgICB9IGVsc2UgaWYgKGFuZ3VsYXIuaXNPYmplY3QoanNvbikpIHtcbiAgICAgICAgYXJyYXkucHVzaChqc29uKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFycmF5Lmxlbmd0aCkge1xuICAgICAgICAvLyBsZXRzIGVuc3VyZSB3ZSBoYXZlIHNvbWUgdmFsaWQgaWRzIGFuZCBzdHVmZi4uLlxuICAgICAgICBhbmd1bGFyLmZvckVhY2goYXJyYXksIChkYXNoLCBpbmRleCkgPT4ge1xuICAgICAgICAgIGFuZ3VsYXIuY29weShkYXNoLCBkYXNoYm9hcmRSZXBvc2l0b3J5LmNyZWF0ZURhc2hib2FyZChkYXNoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LnB1dERhc2hib2FyZHMoYXJyYXksIFwiSW1wb3J0ZWQgZGFzaGJvYXJkIEpTT05cIiwgRGFzaGJvYXJkLm9uT3BlcmF0aW9uQ29tcGxldGUpO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChcIi9kYXNoYm9hcmQvZWRpdFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJkYXNoYm9hcmRQbHVnaW4udHNcIi8+XG4vKipcbiAqIEBtb2R1bGUgRGFzaGJvYXJkXG4gKi9cbm1vZHVsZSBEYXNoYm9hcmQge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJEYXNoYm9hcmQuTmF2QmFyQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm9vdFNjb3BlXCIsIFwiZGFzaGJvYXJkUmVwb3NpdG9yeVwiLCAoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRyb290U2NvcGUsIGRhc2hib2FyZFJlcG9zaXRvcnk6RGFzaGJvYXJkUmVwb3NpdG9yeSkgPT4ge1xuXG4gICAgJHNjb3BlLl9kYXNoYm9hcmRzID0gW107XG5cbiAgICAkc2NvcGUuYWN0aXZlRGFzaGJvYXJkID0gJHJvdXRlUGFyYW1zWydkYXNoYm9hcmRJZCddO1xuXG4gICAgJHNjb3BlLiRvbignbG9hZERhc2hib2FyZHMnLCBsb2FkRGFzaGJvYXJkcyk7XG5cbiAgICAkc2NvcGUuJG9uKCdkYXNoYm9hcmRzVXBkYXRlZCcsIGRhc2hib2FyZExvYWRlZCk7XG5cbiAgICAkc2NvcGUuZGFzaGJvYXJkcyA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuX2Rhc2hib2FyZHNcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uVGFiUmVuYW1lZCA9IGZ1bmN0aW9uKGRhc2gpIHtcbiAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyhbZGFzaF0sIFwiUmVuYW1lZCBkYXNoYm9hcmRcIiwgKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGRhc2hib2FyZExvYWRlZChldmVudCwgZGFzaGJvYXJkcykge1xuICAgICAgbG9nLmRlYnVnKFwibmF2YmFyIGRhc2hib2FyZExvYWRlZDogXCIsIGRhc2hib2FyZHMpO1xuICAgICAgJHNjb3BlLl9kYXNoYm9hcmRzID0gZGFzaGJvYXJkcztcbiAgICAgIGlmIChldmVudCA9PT0gbnVsbCkge1xuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Rhc2hib2FyZHNVcGRhdGVkJywgZGFzaGJvYXJkcyk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZERhc2hib2FyZHMoZXZlbnQpIHtcbiAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkcygoZGFzaGJvYXJkcykgPT4ge1xuICAgICAgICAvLyBwcmV2ZW50IHRoZSBicm9hZGNhc3QgZnJvbSBoYXBwZW5pbmcuLi5cbiAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkUGx1Z2luLnRzXCIvPlxuLyoqXG4gKiBAbW9kdWxlIERhc2hib2FyZFxuICovXG5tb2R1bGUgRGFzaGJvYXJkIHtcbiAgZXhwb3J0IHZhciBTaGFyZUNvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJEYXNoYm9hcmQuU2hhcmVDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcImRhc2hib2FyZFJlcG9zaXRvcnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIGRhc2hib2FyZFJlcG9zaXRvcnk6RGFzaGJvYXJkUmVwb3NpdG9yeSkgPT4ge1xuICAgIHZhciBpZCA9ICRyb3V0ZVBhcmFtc1tcImRhc2hib2FyZElkXCJdO1xuICAgIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkKGlkLCBvbkRhc2hib2FyZExvYWQpO1xuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBtb2RlOiB7XG4gICAgICAgICAgbmFtZTogXCJqYXZhc2NyaXB0XCJcbiAgICAgIH1cbiAgICB9O1xuICAgIC8vJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcblxuICAgIGZ1bmN0aW9uIG9uRGFzaGJvYXJkTG9hZChkYXNoYm9hcmQpIHtcbiAgICAgICRzY29wZS5kYXNoYm9hcmQgPSBEYXNoYm9hcmQuY2xlYW5EYXNoYm9hcmREYXRhKGRhc2hib2FyZCk7XG5cbiAgICAgICRzY29wZS5qc29uID0ge1xuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiaGF3dGlvIGRhc2hib2FyZHNcIixcbiAgICAgICAgXCJwdWJsaWNcIjogdHJ1ZSxcbiAgICAgICAgXCJmaWxlc1wiOiB7XG4gICAgICAgICAgXCJkYXNoYm9hcmRzLmpzb25cIjoge1xuICAgICAgICAgICAgXCJjb250ZW50XCI6IEpTT04uc3RyaW5naWZ5KCRzY29wZS5kYXNoYm9hcmQsIG51bGwsIFwiICBcIilcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zb3VyY2UgPSBKU09OLnN0cmluZ2lmeSgkc2NvcGUuZGFzaGJvYXJkLCBudWxsLCBcIiAgXCIpO1xuICAgICAgQ29yZS4kYXBwbHlOb3dPckxhdGVyKCRzY29wZSk7XG4gICAgfVxuICB9XSk7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
angular.module("hawtio-dashboard-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/dashboard/html/addToDashboard.html","<div class=\"controller-section\" ng-controller=\"Dashboard.EditDashboardsController\">\n  <div class=\"row-fluid\">\n    <div class=\"span10 offset1 well\">\n      Select a dashboard (or multiple dashboards) in the table below and click \"Add View To Dashboard\" to add the view to a dashboard.  You can also create a new dashboard using the \"Create\" button, select it and then click the \"Add View To Dashboard\" to add the view to a new dashboard.\n    </div>\n  </div>\n  <div class=\"row-fluid\">\n\n    <div class=\"span12\">\n      <ul class=\"nav nav-tabs\">\n        <li>\n          <button class=\"btn btn-primary\" \n                  ng-disabled=\"!hasSelection()\" ng-click=\"addViewToDashboard()\"\n                  title=\"Adds the current view to the selected dashboard(s)\" data-placement=\"bottom\">\n            <i class=\"fa fa-dashboard\"></i> Add View To Dashboard\n          </a>\n        </li>\n        <li>\n          <button class=\"btn btn-success\" ng-click=\"create()\"\n             title=\"Create a new empty dashboard\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-plus\"></i> Create</button>\n        </li>\n      </ul>\n\n    </div>\n    <!--\n    <div class=\"span6\">\n      <div class=\"control-group\">\n        <input type=\"text\" class=\"span12 search-query\" ng-model=\"gridOptions.filterOptions.filterText\" placeholder=\"Filter...\">\n      </div>\n    </div>\n    -->\n  </div>\n\n  <div class=\"row-fluid\">\n    <table class=\"table table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n  </div>\n</div>\n");
$templateCache.put("plugins/dashboard/html/createDashboardModal.html","<div class=\"modal-header\">\n  <h3 class=\"modal-title\">Create New Dashboard</h3>\n</div>\n<div class=\"modal-body\">\n  <div hawtio-form-2=\"config\" entity=\"entity\"></div>\n</div>\n<div class=\"modal-footer\">\n  <button class=\"btn btn-primary\" ng-click=\"ok()\">OK</button>\n  <button class=\"btn btn-warning\" ng-click=\"cancel()\">Cancel</button>\n</div>\n");
$templateCache.put("plugins/dashboard/html/dashboard.html","<script type=\"text/ng-template\" id=\"widgetTemplate\">\n  <div class=\"widget-area\">\n    <div class=\"widget-title\" ng-controller=\"HawtioDashboard.Title\">\n      <div class=\"row-fluid\">\n        <div class=\"pull-left\">\n          {{widget.title}}\n        </div>\n        <div class=\"pull-right\">\n          <i class=\"fa fa-pencil\" title=\"Rename this widget\" ng-click=\"renameWidget(widget)\"></i>\n          <i class=\"fa fa-times\" title=\"Removes this view from the dashboard\" ng-click=\"removeWidget(widget)\"></i>\n        </div>\n      </div>\n    </div>\n    <div class=\"widget-body\">\n    </div>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"iframeWidgetTemplate.html\">\n  <div class=\"widget-area\" data-widgetId=\"{{widget.id}}\">\n    <div class=\"widget-title\">\n      <div class=\"row-fluid\">\n        <div class=\"pull-left\">\n          {{widget.title}}\n        </div>\n        <div class=\"pull-right\">\n          <i class=\"fa fa-pencil\" title=\"Rename this widget\" ng-click=\"renameWidget(widget)\"></i>\n          <i class=\"fa fa-times\" title=\"Removes this view from the dashboard\" ng-click=\"removeWidget(widget)\"></i>\n        </div>\n      </div>\n    </div>\n    <div class=\"widget-body\">\n      <div class=\"iframe-holder\">\n        <iframe seamless=\"true\"></iframe>\n      </div>\n    </div>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"widgetBlockTemplate.html\">\n  <li class=\"grid-block\" style=\"display: list-item; position: absolute\" ng-non-bindable data-$injector=\"\"></li>\n</script>\n\n<!--\n<div class=\"gridster\" ng-controller=\"Dashboard.DashboardController\">\n  <ul id=\"widgets\">\n  </ul>\n</div>\n-->\n\n<div class=\"row-fluid\">\n  <div class=\"span12 gridster\">\n    <ul id=\"widgets\" hawtio-dashboard></ul>\n  </div>\n</div>\n\n\n");
$templateCache.put("plugins/dashboard/html/deleteDashboardModal.html","<div class=\"modal-header\">\n  <h3 class=\"modal-title\">Delete Dashboards?</h3>\n</div>\n<div class=\"modal-body\">\n  <p>Are you sure you want to delete the selected dashboards:</p>\n  <ul>\n    <li ng-repeat=\"dashboard in selected track by $index\">{{dashboard.title}}</li>\n  </ul>\n  <p class=\"strong\">This operation cannot be undone</p>\n</div>\n<div class=\"modal-footer\">\n  <button class=\"btn btn-primary\" ng-click=\"ok()\">OK</button>\n  <button class=\"btn btn-warning\" ng-click=\"cancel()\">Cancel</button>\n</div>\n");
$templateCache.put("plugins/dashboard/html/deleteWidgetModal.html","<div class=\"modal-header\">\n  <h3 class=\"modal-title\">Delete Widget</h3>\n</div>\n<div class=\"modal-body\">\n  <p>Are you sure you want to delete the widget <span ng-show=\"widget.title\">\"{{widget.title}}\"</span>?</p>\n  <p class=\"strong\">This operation cannot be undone</p>\n</div>\n<div class=\"modal-footer\">\n  <button class=\"btn btn-primary\" ng-click=\"ok()\">OK</button>\n  <button class=\"btn btn-warning\" ng-click=\"cancel()\">Cancel</button>\n</div>\n");
$templateCache.put("plugins/dashboard/html/editDashboardTitleCell.html","<div class=\"ngCellText\"><a href=\"/dashboard/id/{{row.entity.id}}{{row.entity.hash}}\">{{row.entity.title}}</a></div>\n");
$templateCache.put("plugins/dashboard/html/editDashboards.html","<div ng-controller=\"Dashboard.EditDashboardsController\">\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <p></p>\n      <ul class=\"nav nav-tabs\">\n        <li>\n          <button class=\"btn btn-success\" ng-click=\"create()\"\n             title=\"Create a new empty dashboard\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-plus\"></i> Create</button>\n        </li>\n        <li>\n          <button class=\"btn\" ng-click=\"renameDashboard()\"\n            ng-disabled=\"gridOptions.selectedItems.length !== 1\"\n             title=\"Rename the selected dashboard\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-arrows-h\"></i> Rename</button>\n        </li>\n        <li>\n          <button class=\"btn\" ng-disabled=\"!hasSelection()\"\n             ng-click=\"duplicate()\"\n                  title=\"Create a copy of the selected dashboard(s)\" data-placement=\"bottom\">\n            <i class=\"fa fa-copy\"></i> Duplicate\n          </button>\n        </li>\n        <li>\n          <button class=\"btn btn-danger\" ng-disabled=\"!hasSelection()\"\n             ng-click=\"deleteDashboard()\">\n             <i class=\"fa fa-remove\"></i> Delete\n          </button>\n        </li>\n        <!--\n        <li class=\"pull-right\">\n          <button class=\"btn btn-primary\" href=\"#/dashboard/import\"\n             title=\"Imports a JSON dashboard configuration from github or some other URL\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-cloud-download\"></i> Import\n          </button>\n        </li>\n        -->\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <p></p>\n      <table class=\"table table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/dashboard/html/import.html","<div class=\"form-horizontal\" ng-controller=\"Dashboard.ImportController\">\n  <div class=\"control-group\">\n    <button id=\"importButton\" ng-disabled=\"!isValid()\" ng-click=\"importJSON()\"\n            class=\"btn btn-info\"\n            title=\"Imports the JSON configuration of the dashboard\">\n      <i class=\"icon-cloud-download\"></i> import dashboard JSON\n    </button>\n    <div id=\"alert-area\" class=\"span9 pull-right\"></div>\n  </div>\n  <div class=\"control-group\">\n    <textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"source\"></textarea>\n  </div>\n</div>");
$templateCache.put("plugins/dashboard/html/renameDashboardModal.html","<div class=\"modal-header\">\n  <h3 class=\"modal-title\">Rename Dashboard \"{{selected.title}}\"</h3>\n</div>\n<div class=\"modal-body\">\n  <div hawtio-form-2=\"config\" entity=\"selected\"></div>\n</div>\n<div class=\"modal-footer\">\n  <button class=\"btn btn-primary\" ng-click=\"ok()\">OK</button>\n  <button class=\"btn btn-warning\" ng-click=\"cancel()\">Cancel</button>\n</div>\n");
$templateCache.put("plugins/dashboard/html/renameWidgetModal.html","<div class=\"modal-header\">\n  <h3 class=\"modal-title\">Rename Dashboard</h3>\n</div>\n<div class=\"modal-body\">\n  <div hawtio-form-2=\"config\" entity=\"widget\"></div>\n</div>\n<div class=\"modal-footer\">\n  <button class=\"btn btn-primary\" ng-click=\"ok()\">OK</button>\n  <button class=\"btn btn-warning\" ng-click=\"cancel()\">Cancel</button>\n</div>\n");}]); hawtioPluginLoader.addModule("hawtio-dashboard-templates");