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
/// <reference path="../libs/hawtio-utilities/defs.d.ts"/>



/// <reference path="../../includes.ts"/>
/// <reference path="dashboardInterfaces.ts"/>
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

/// <reference path="dashboardHelpers.ts"/>
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
            $routeProvider.
                when('/dashboard/add', { templateUrl: Dashboard.templatePath + 'addToDashboard.html' }).
                when('/dashboard/edit', { templateUrl: Dashboard.templatePath + 'editDashboards.html' }).
                when('/dashboard/idx/:dashboardIndex', { templateUrl: Dashboard.templatePath + 'dashboard.html', reloadOnSearch: false }).
                when('/dashboard/id/:dashboardId', { templateUrl: Dashboard.templatePath + 'dashboard.html', reloadOnSearch: false }).
                when('/dashboard/id/:dashboardId/share', { templateUrl: Dashboard.templatePath + 'share.html' }).
                when('/dashboard/import', { templateUrl: Dashboard.templatePath + 'import.html' });
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
            var child = builder
                .id('dashboard-' + dashboard.id)
                .title(function () { return dashboard.title || dashboard.id; })
                .href(function () {
                var uri = new URI(UrlHelpers.join('/dashboard/id', dashboard.id));
                uri.search({
                    'main-tab': Dashboard.pluginName,
                    'sub-tab': 'dashboard-' + dashboard.id
                });
                return uri.toString();
            })
                .build();
            tab.tabs.push(child);
        });
        var manage = builder
            .id('dashboard-manage')
            .title(function () { return '<i class="fa fa-pencil"></i>&nbsp;Manage'; })
            .href(function () { return '/dashboard/edit?main-tab=dashboard&sub-tab=dashboard-manage'; })
            .build();
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
                tab = builder.id(Dashboard.pluginName)
                    .href(function () { return '/dashboard/idx/0'; })
                    .title(function () { return 'Dashboard'; })
                    .build();
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

/// <reference path="dashboardPlugin.ts"/>
/// <reference path="dashboardInterfaces.ts"/>
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
                var existing = dashboards.findIndex(function (d) { return d.id === dash.id; });
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
                dashboards.remove(function (i) { return i.id === item.id; });
            });
            fn(this.storeDashboards(dashboards));
        };
        LocalDashboardRepository.prototype.getDashboards = function (fn) {
            fn(this.loadDashboards());
        };
        LocalDashboardRepository.prototype.getDashboard = function (id, fn) {
            var dashboards = this.loadDashboards();
            var dashboard = dashboards.find(function (dashboard) { return dashboard.id === id; });
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

/// <reference path="dashboardPlugin.ts"/>
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
                    id: Core.getUUID(),
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
                        return !(left(w2) > right(w1) ||
                            right(w2) < left(w1) ||
                            top(w2) > bottom(w1) ||
                            bottom(w2) < top(w1));
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
                        }).removeQuery('href')
                            .removeQuery('title')
                            .removeQuery('iframe')
                            .removeQuery('size');
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
                commitMessage = commitMessage + newDashboards.map(function (d) { return d.title; }).join(',');
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

/// <reference path="dashboardHelpers.ts"/>
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

/// <reference path="dashboardPlugin.ts"/>
/// <reference path="dashboardRepository.ts"/>
/// <reference path="rectangleLocation.ts"/>
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
            this.controller = ["$scope", "$element", "$attrs", "$location", "$routeParams", "$templateCache", "dashboardRepository", "$compile", "$templateRequest", "$interpolate", "$modal", "$sce", "$timeout", function ($scope, $element, $attrs, $location, $routeParams, $templateCache, dashboardRepository, $compile, $templateRequest, $interpolate, $modal, $sce, $timeout) {
                    var gridSize = 150;
                    var gridMargin = 6;
                    var gridHeight;
                    var gridX = gridSize;
                    var gridY = gridSize;
                    var widgetMap = {};
                    var dashboardRepository = $scope.$eval('dashboardRepository') || dashboardRepository;
                    $scope.$on('$destroy', function () {
                        angular.forEach(widgetMap, function (value, key) {
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
                        var widgetData = widgetMap[widget.id];
                        if (widgetData) {
                            delete widgetMap[widget.id];
                            widgetElem = widgetData.widget;
                        }
                        if (!widgetElem) {
                            widgetElem = $element.find("[data-widgetId='" + widget.id + "']").parent();
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
                        Dashboard.log.debug("Widget ID: ", widget.id, " widgetMap: ", widgetMap);
                        var entry = widgetMap[widget.id];
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
                        $scope.id = $scope.$eval('dashboardId') || $routeParams["dashboardId"];
                        $scope.idx = $scope.$eval('dashboardIndex') || $routeParams["dashboardIndex"];
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
                                if ($scope.$eval('dashboardEmbedded')) {
                                    Core.$apply($scope);
                                    return;
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
                            if (angular.isDefined(widget.size_x
                                && angular.isDefined(widget.col))) {
                                var rightEdge = widget.col + widget.size_x;
                                if (rightEdge > minWidth) {
                                    minWidth = rightEdge + 1;
                                }
                            }
                        });
                        var gridster = $element.gridster({
                            widget_margins: [gridMargin, gridMargin],
                            widget_base_dimensions: [gridX, gridY],
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
                                    Dashboard.log.debug("Rendering external (iframe) widget: ", widget.title || widget.id);
                                    var scope = $scope.$new();
                                    scope.widget = widget;
                                    scope.removeWidget = function (widget) { return doRemoveWidget($modal, widget); };
                                    scope.renameWidget = function (widget) { return doRenameWidget($modal, widget); };
                                    var widgetBody = angular.element($templateCache.get('iframeWidgetTemplate.html'));
                                    var outerDiv = angular.element($templateCache.get('widgetBlockTemplate.html'));
                                    widgetBody.find('iframe').attr('src', widget.iframe);
                                    outerDiv.append($compile(widgetBody)(scope));
                                    var w = gridster.add_widget(outerDiv, widget.size_x, widget.size_y, widget.col, widget.row);
                                    widgetMap[widget.id] = {
                                        widget: w
                                    };
                                    maybeFinishUp();
                                    break;
                                case 'internal':
                                    Dashboard.log.debug("Rendering internal widget: ", widget.title || widget.id);
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
                                    Dashboard.log.debug("include: ", widget.include);
                                    var widgetBody = $templateCache.get(widget.include);
                                    $timeout(function () {
                                        var outerDiv = angular.element($templateCache.get('widgetBlockTemplate.html'));
                                        body.html(widgetBody);
                                        outerDiv.html(div);
                                        angular.bootstrap(div, [tmpModuleName]);
                                        widgetMap[widget.id] = {
                                            widget: gridster.add_widget(outerDiv, widget.size_x, widget.size_y, widget.col, widget.row)
                                        };
                                        maybeFinishUp();
                                    }, 50);
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

/// <reference path="dashboardPlugin.ts"/>
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

/// <reference path="dashboardPlugin.ts"/>
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

/// <reference path="dashboardPlugin.ts"/>
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLnRzIiwiZGFzaGJvYXJkL3RzL2Rhc2hib2FyZEludGVyZmFjZXMudHMiLCJkYXNoYm9hcmQvdHMvZGFzaGJvYXJkSGVscGVycy50cyIsImRhc2hib2FyZC90cy9kYXNoYm9hcmRQbHVnaW4udHMiLCJkYXNoYm9hcmQvdHMvZGFzaGJvYXJkUmVwb3NpdG9yeS50cyIsImRhc2hib2FyZC90cy9lZGl0RGFzaGJvYXJkcy50cyIsImRhc2hib2FyZC90cy9yZWN0YW5nbGVMb2NhdGlvbi50cyIsImRhc2hib2FyZC90cy9ncmlkc3RlckRpcmVjdGl2ZS50cyIsImRhc2hib2FyZC90cy9pbXBvcnQudHMiLCJkYXNoYm9hcmQvdHMvbmF2YmFyLnRzIiwiZGFzaGJvYXJkL3RzL3NoYXJlLnRzIl0sIm5hbWVzIjpbIkRhc2hib2FyZCIsIkRhc2hib2FyZC5jbGVhbkRhc2hib2FyZERhdGEiLCJEYXNoYm9hcmQuZGVjb2RlVVJJQ29tcG9uZW50UHJvcGVydGllcyIsIkRhc2hib2FyZC5vbk9wZXJhdGlvbkNvbXBsZXRlIiwiRGFzaGJvYXJkLnNldFN1YlRhYnMiLCJEYXNoYm9hcmQuTG9jYWxEYXNoYm9hcmRSZXBvc2l0b3J5IiwiRGFzaGJvYXJkLkxvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeS5jb25zdHJ1Y3RvciIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkubG9hZERhc2hib2FyZHMiLCJEYXNoYm9hcmQuTG9jYWxEYXNoYm9hcmRSZXBvc2l0b3J5LnN0b3JlRGFzaGJvYXJkcyIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkuZGVsZXRlRGFzaGJvYXJkcyIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkcyIsIkRhc2hib2FyZC5Mb2NhbERhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkIiwiRGFzaGJvYXJkLkxvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeS5jcmVhdGVEYXNoYm9hcmQiLCJEYXNoYm9hcmQuTG9jYWxEYXNoYm9hcmRSZXBvc2l0b3J5LmNsb25lRGFzaGJvYXJkIiwiRGFzaGJvYXJkLkxvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeS5nZXRUeXBlIiwiRGFzaGJvYXJkLnVwZGF0ZURhdGEiLCJEYXNoYm9hcmQuZGFzaGJvYXJkTG9hZGVkIiwiRGFzaGJvYXJkLmRhc2hib2FyZHMiLCJEYXNoYm9hcmQuZGVzZWxlY3RBbGwiLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24iLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24uY29uc3RydWN0b3IiLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24uYWJzVXJsIiwiRGFzaGJvYXJkLlJlY3RhbmdsZUxvY2F0aW9uLmhhc2giLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24uaG9zdCIsIkRhc2hib2FyZC5SZWN0YW5nbGVMb2NhdGlvbi5wYXRoIiwiRGFzaGJvYXJkLlJlY3RhbmdsZUxvY2F0aW9uLnBvcnQiLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24ucHJvdG9jb2wiLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24ucmVwbGFjZSIsIkRhc2hib2FyZC5SZWN0YW5nbGVMb2NhdGlvbi5zZWFyY2giLCJEYXNoYm9hcmQuUmVjdGFuZ2xlTG9jYXRpb24udXJsIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLnJlbW92ZVdpZGdldCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci5jaGFuZ2VXaWRnZXRTaXplIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLm9uV2lkZ2V0UmVuYW1lZCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci51cGRhdGVXaWRnZXRzIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLm9uRGFzaGJvYXJkTG9hZCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci5vbkRhc2hib2FyZExvYWQubWF5YmVGaW5pc2hVcCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci5vbkRhc2hib2FyZExvYWQuZG9SZW1vdmVXaWRnZXQiLCJEYXNoYm9hcmQuR3JpZHN0ZXJEaXJlY3RpdmUuY29uc3RydWN0b3Iub25EYXNoYm9hcmRMb2FkLmRvUmVuYW1lV2lkZ2V0IiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLnNlcmlhbGl6ZURhc2hib2FyZCIsIkRhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZS5jb25zdHJ1Y3Rvci5tYWtlUmVzaXphYmxlIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLnJlc2l6ZUJsb2NrIiwiRGFzaGJvYXJkLkdyaWRzdGVyRGlyZWN0aXZlLmNvbnN0cnVjdG9yLnVwZGF0ZURhc2hib2FyZFJlcG9zaXRvcnkiLCJEYXNoYm9hcmQuR3JpZHN0ZXJEaXJlY3RpdmUuY29uc3RydWN0b3IuZ2V0R3JpZHN0ZXIiLCJEYXNoYm9hcmQubG9hZERhc2hib2FyZHMiLCJEYXNoYm9hcmQub25EYXNoYm9hcmRMb2FkIl0sIm1hcHBpbmdzIjoiQUFBQSwyREFBMkQ7QUFDM0QsNERBQTREO0FBQzVELEdBQUc7QUFDSCxtRUFBbUU7QUFDbkUsb0VBQW9FO0FBQ3BFLDJDQUEyQztBQUMzQyxHQUFHO0FBQ0gsZ0RBQWdEO0FBQ2hELEdBQUc7QUFDSCx1RUFBdUU7QUFDdkUscUVBQXFFO0FBQ3JFLDRFQUE0RTtBQUM1RSx1RUFBdUU7QUFDdkUsa0NBQWtDO0FBRWxDLDBEQUEwRDs7QUN1Q3pEOztBQ3RERCx5Q0FBeUM7QUFD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LElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29DQUNyREEsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0NBQzdDQSxJQUFJQSxDQUFDQSxHQUFHQSxRQUFRQSxDQUFDQSxVQUFVQSxDQUFDQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxHQUFHQSxFQUFFQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtvQ0FDNUZBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBO3dDQUNyQkEsTUFBTUEsRUFBRUEsQ0FBQ0E7cUNBQ1ZBLENBQUNBO29DQUNGQSxhQUFhQSxFQUFFQSxDQUFDQTtvQ0FDaEJBLEtBQUtBLENBQUNBO2dDQUNSQSxLQUFLQSxVQUFVQTtvQ0FDYkEsYUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsNkJBQTZCQSxFQUFFQSxNQUFNQSxDQUFDQSxLQUFLQSxJQUFJQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtvQ0FDcEVBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO29DQUN2QkEsSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0E7b0NBQ2xCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTt3Q0FDbEJBLE1BQU1BLEdBQUdBLFNBQVNBLENBQUNBLDRCQUE0QkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0NBQ2pFQSxDQUFDQTtvQ0FDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0NBQ3ZCQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxDQUFDQTtvQ0FDekRBLENBQUNBO29DQUNEQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtvQ0FDdkJBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLDJCQUFpQkEsQ0FBQ0EsU0FBU0EsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0NBQ3BFQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxJQUFJQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3Q0FDeENBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBO29DQUNwQkEsQ0FBQ0E7b0NBQ0RBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLElBQUlBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dDQUN4Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0NBQ3BCQSxDQUFDQTtvQ0FDREEsSUFBSUEsYUFBYUEsR0FBR0EsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7b0NBQzdDQSxJQUFJQSxTQUFTQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxhQUFhQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFDQTtvQ0FDdkRBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLFVBQVVBLEVBQUVBLFVBQUNBLFFBQVFBOzRDQUNyQ0EsUUFBUUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsaUJBQWlCQSxFQUFFQSxDQUFDQSxXQUFXQSxFQUFFQSxZQUFZQSxFQUFFQSxVQUFDQSxTQUFTQSxFQUFFQSxVQUFVQTtvREFDdEZBLFNBQVNBLENBQUNBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBO29EQUM3QkEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7Z0RBQ25CQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTs0Q0FDSkEsUUFBUUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsV0FBV0EsRUFBRUEsVUFBQ0EsU0FBU0E7b0RBRXREQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtnREFDbEJBLENBQUNBLENBQUNBLENBQUNBLENBQUNBOzRDQUNKQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQSxXQUFXQSxFQUFFQSxVQUFDQSxTQUFTQTtvREFJbkRBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBO2dEQUNuQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NENBQ0pBLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBLGNBQWNBLEVBQUVBLENBQUNBLFdBQVdBLEVBQUVBLFVBQUNBLFNBQVNBO29EQUV6REEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0RBQ2hCQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3Q0FDTkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0NBQ0pBLFNBQVNBLENBQUNBLFVBQVVBLENBQUNBLHVCQUF1QkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsTUFBTUE7NENBQ2hGQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQTs0Q0FDdkJBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFVBQUNBLE1BQU1BLElBQUtBLE9BQUFBLGNBQWNBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLEVBQTlCQSxDQUE4QkEsQ0FBQ0E7NENBQ2pFQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxVQUFDQSxNQUFNQSxJQUFLQSxPQUFBQSxjQUFjQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxFQUE5QkEsQ0FBOEJBLENBQUNBO3dDQUNuRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0NBRUpBLElBQUlBLEdBQUdBLEdBQU9BLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO29DQUMxQkEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsZUFBZUEsRUFBRUEsTUFBTUEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0NBQ3pDQSxJQUFJQSxJQUFJQSxHQUFHQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQTtvQ0FDcENBLGFBQUdBLENBQUNBLEtBQUtBLENBQUNBLFdBQVdBLEVBQUVBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO29DQUN2Q0EsSUFBSUEsVUFBVUEsR0FBR0EsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7b0NBQ3BEQSxRQUFRQSxDQUFDQTt3Q0FDUEEsSUFBSUEsUUFBUUEsR0FBR0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsMEJBQTBCQSxDQUFDQSxDQUFDQSxDQUFDQTt3Q0FDL0VBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO3dDQUN0QkEsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0NBQ25CQSxPQUFPQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTt3Q0FDeENBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBOzRDQUNyQkEsTUFBTUEsRUFBRUEsUUFBUUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsUUFBUUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsR0FBR0EsRUFBRUEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0E7eUNBQzVGQSxDQUFDQTt3Q0FDRkEsYUFBYUEsRUFBRUEsQ0FBQ0E7b0NBQ2xCQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtvQ0FDUEEsS0FBS0EsQ0FBQ0E7NEJBQ1ZBLENBQUNBO3dCQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDTEEsQ0FBQ0E7b0JBRURMO3dCQUNFUyxJQUFJQSxRQUFRQSxHQUFHQSxXQUFXQSxFQUFFQSxDQUFDQTt3QkFDN0JBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBOzRCQUNiQSxJQUFJQSxJQUFJQSxHQUFHQSxRQUFRQSxDQUFDQSxTQUFTQSxFQUFFQSxDQUFDQTs0QkFHaENBLElBQUlBLE9BQU9BLEdBQUdBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLE9BQU9BLElBQUlBLEVBQUVBLENBQUNBOzRCQUk3Q0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsT0FBT0EsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsR0FBR0E7Z0NBQ25DQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQ0FDdEJBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLElBQUlBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29DQUVwQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsS0FBS0EsRUFBRUEsVUFBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsSUFBS0EsT0FBQUEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsSUFBSUEsRUFBbEJBLENBQWtCQSxDQUFDQSxDQUFDQTtnQ0FDNURBLENBQUNBOzRCQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDSEEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7d0JBQ2RBLENBQUNBO3dCQUNEQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFDZkEsQ0FBQ0E7b0JBRURUO3dCQUNFVSxJQUFJQSxNQUFNQSxHQUFPQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQTt3QkFDbENBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO3dCQUU1QkEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7NEJBQ2ZBLElBQUlBLEVBQUVBLENBQUNBLFFBQVFBLEdBQUdBLENBQUNBLFVBQVVBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLFFBQVFBLEdBQUdBLENBQUNBLFVBQVVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBOzRCQUNoRUEsT0FBT0EsRUFBRUEsS0FBS0E7NEJBQ2RBLFFBQVFBLEVBQUVBLFFBQVFBOzRCQUNsQkEsU0FBU0EsRUFBRUEsUUFBUUE7NEJBQ25CQSxRQUFRQSxFQUFFQSxLQUFLQTs0QkFDZkEsS0FBS0EsRUFBRUEsVUFBU0EsS0FBS0EsRUFBRUEsRUFBRUE7Z0NBQ3ZCLFVBQVUsR0FBRyxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7NEJBQzFDLENBQUM7NEJBQ0RBLE1BQU1BLEVBQUVBLFVBQVNBLEtBQUtBLEVBQUVBLEVBQUVBO2dDQUV4QixJQUFJLENBQUMsR0FBRyxXQUFXLEVBQUUsQ0FBQztnQ0FDdEIsSUFBSSxLQUFLLEdBQUcsUUFBUSxHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUM7Z0NBQ3RDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUNuQyxDQUFDO29DQUNDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztvQ0FDakUsSUFBSSxTQUFTLEdBQUcsVUFBVSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUM7b0NBQzNDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztnQ0FDakMsQ0FBQzs0QkFDSCxDQUFDOzRCQUNEQSxJQUFJQSxFQUFFQSxVQUFTQSxLQUFLQSxFQUFFQSxFQUFFQTtnQ0FDdEIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUN0QixVQUFVLENBQUM7b0NBQ1QsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dDQUN2QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQ1YsQ0FBQzt5QkFDRkEsQ0FBQ0EsQ0FBQ0E7d0JBRUhBLENBQUNBLENBQUNBLHNCQUFzQkEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7NEJBQzlCLFdBQVcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUMxQixDQUFDLEVBQUVBOzRCQUNELFdBQVcsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUN6QixDQUFDLENBQUNBLENBQUNBO29CQUVMQSxDQUFDQTtvQkFHRFYscUJBQXFCQSxNQUFNQTt3QkFDekJXLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBO3dCQUN2Q0EsSUFBSUEsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsS0FBS0EsRUFBRUEsR0FBR0EsUUFBUUEsQ0FBQ0E7d0JBQ2xDQSxJQUFJQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxHQUFHQSxRQUFRQSxDQUFDQTt3QkFFbkNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLENBQUNBLFVBQVVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBOzRCQUMvREEsTUFBTUEsRUFBRUEsQ0FBQ0E7d0JBQ1hBLENBQUNBO3dCQUVEQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxDQUFDQSxVQUFVQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQTs0QkFDL0RBLE1BQU1BLEVBQUVBLENBQUNBO3dCQUNYQSxDQUFDQTt3QkFFREEsSUFBSUEsTUFBTUEsR0FBR0E7NEJBQ1hBLEVBQUVBLEVBQUVBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBO3lCQUMvQkEsQ0FBQ0E7d0JBRUZBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsRUFBRUEsVUFBU0EsTUFBTUE7NEJBQ3RDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDOzRCQUN2QixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQzt3QkFDekIsQ0FBQyxFQUFFQSxVQUFTQSxNQUFNQTs0QkFDaEIsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0NBQ3pCLHlCQUF5QixDQUFDLDBCQUEwQixHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDcEUsQ0FBQzt3QkFDSCxDQUFDLENBQUNBLENBQUNBO29CQUVMQSxDQUFDQTtvQkFFRFgsbUNBQW1DQSxPQUFlQTt3QkFDaERZLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBOzRCQUNyQkEsSUFBSUEsYUFBYUEsR0FBR0EsT0FBT0EsQ0FBQ0E7NEJBQzVCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxJQUFJQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDL0NBLGFBQWFBLElBQUlBLGdCQUFnQkEsR0FBR0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7NEJBQzdEQSxDQUFDQTs0QkFDREEsbUJBQW1CQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxFQUFFQSxhQUFhQSxFQUFFQSxTQUFTQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO3dCQUN0R0EsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUVEWjt3QkFDRWEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7b0JBQzlDQSxDQUFDQTtnQkFFSGIsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFTEEsQ0FBQ0E7UUFBREQsd0JBQUNBO0lBQURBLENBNVlBL0IsQUE0WUMrQixJQUFBL0I7SUE1WVlBLDJCQUFpQkEsb0JBNFk3QkEsQ0FBQUE7QUFFSEEsQ0FBQ0EsRUF6Wk0sU0FBUyxLQUFULFNBQVMsUUF5WmY7O0FDL1pELDBDQUEwQztBQUkxQyxJQUFPLFNBQVMsQ0F5Q2Y7QUF6Q0QsV0FBTyxTQUFTLEVBQUMsQ0FBQztJQUNoQkEsaUJBQU9BLENBQUNBLFVBQVVBLENBQUNBLDRCQUE0QkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsV0FBV0EsRUFBRUEsY0FBY0EsRUFBRUEscUJBQXFCQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSxtQkFBdUNBO1lBQ3ZMQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxrRUFBa0VBLENBQUNBO1lBQ3hGQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQTtZQUVuQ0EsSUFBSUEsT0FBT0EsR0FBR0E7Z0JBQ1pBLElBQUlBLEVBQUVBO29CQUNKQSxJQUFJQSxFQUFFQSxZQUFZQTtpQkFDbkJBO2FBQ0ZBLENBQUNBO1lBSUZBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLGNBQU1BLE9BQUFBLE1BQU1BLENBQUNBLE1BQU1BLElBQUlBLE1BQU1BLENBQUNBLE1BQU1BLEtBQUtBLE1BQU1BLENBQUNBLFdBQVdBLEVBQXJEQSxDQUFxREEsQ0FBQ0E7WUFFN0VBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBO2dCQUNsQkEsSUFBSUEsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBRWRBLElBQUlBLENBQUNBO29CQUNIQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQkFDbkNBLENBQUVBO2dCQUFBQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFWEEsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ1pBLENBQUNBO2dCQUNEQSxJQUFJQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDZkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzFCQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDZkEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUNsQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25CQSxDQUFDQTtnQkFFREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRWpCQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxFQUFFQSxVQUFDQSxJQUFJQSxFQUFFQSxLQUFLQTt3QkFDakNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEVBQUVBLG1CQUFtQkEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2hFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsbUJBQW1CQSxDQUFDQSxhQUFhQSxDQUFDQSxLQUFLQSxFQUFFQSx5QkFBeUJBLEVBQUVBLFNBQVNBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7b0JBQ25HQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxpQkFBaUJBLENBQUNBLENBQUNBO2dCQUNwQ0EsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQUE7UUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDTkEsQ0FBQ0EsRUF6Q00sU0FBUyxLQUFULFNBQVMsUUF5Q2Y7O0FDN0NELDBDQUEwQztBQUkxQyxJQUFPLFNBQVMsQ0FzQ2Y7QUF0Q0QsV0FBTyxTQUFTLEVBQUMsQ0FBQztJQUNoQkEsaUJBQU9BLENBQUNBLFVBQVVBLENBQUNBLDRCQUE0QkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsY0FBY0EsRUFBRUEsWUFBWUEsRUFBRUEscUJBQXFCQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxZQUFZQSxFQUFFQSxVQUFVQSxFQUFFQSxtQkFBdUNBO1lBRXpMQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUV4QkEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsWUFBWUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFFckRBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFnQkEsRUFBRUEsY0FBY0EsQ0FBQ0EsQ0FBQ0E7WUFFN0NBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLG1CQUFtQkEsRUFBRUEsZUFBZUEsQ0FBQ0EsQ0FBQ0E7WUFFakRBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBO2dCQUNsQkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQUE7WUFDM0JBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFVBQVNBLElBQUlBO2dCQUNqQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxVQUFDLFVBQVU7b0JBQ3hFLGVBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ3BDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDQTtZQUVGQSx5QkFBeUJBLEtBQUtBLEVBQUVBLFVBQVVBO2dCQUN4Q2lCLGFBQUdBLENBQUNBLEtBQUtBLENBQUNBLDBCQUEwQkEsRUFBRUEsVUFBVUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xEQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxVQUFVQSxDQUFDQTtnQkFDaENBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO29CQUNuQkEsVUFBVUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsbUJBQW1CQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTtvQkFDdkRBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUN0QkEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFFRGpCLHdCQUF3QkEsS0FBS0E7Z0JBQzNCOEMsbUJBQW1CQSxDQUFDQSxhQUFhQSxDQUFDQSxVQUFDQSxVQUFVQTtvQkFFM0NBLGVBQWVBLENBQUNBLElBQUlBLEVBQUVBLFVBQVVBLENBQUNBLENBQUNBO29CQUNsQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3RCQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNMQSxDQUFDQTtRQUNIOUMsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDTkEsQ0FBQ0EsRUF0Q00sU0FBUyxLQUFULFNBQVMsUUFzQ2Y7O0FDMUNELDBDQUEwQztBQUkxQyxJQUFPLFNBQVMsQ0E2QmY7QUE3QkQsV0FBTyxTQUFTLEVBQUMsQ0FBQztJQUNMQSx5QkFBZUEsR0FBR0EsaUJBQU9BLENBQUNBLFVBQVVBLENBQUNBLDJCQUEyQkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsV0FBV0EsRUFBRUEsY0FBY0EsRUFBRUEscUJBQXFCQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSxtQkFBdUNBO1lBQ25OQSxJQUFJQSxFQUFFQSxHQUFHQSxZQUFZQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQTtZQUNyQ0EsbUJBQW1CQSxDQUFDQSxZQUFZQSxDQUFDQSxFQUFFQSxFQUFFQSxlQUFlQSxDQUFDQSxDQUFDQTtZQUV0REEsSUFBSUEsT0FBT0EsR0FBR0E7Z0JBQ1pBLElBQUlBLEVBQUVBO29CQUNGQSxJQUFJQSxFQUFFQSxZQUFZQTtpQkFDckJBO2FBQ0ZBLENBQUNBO1lBR0ZBLHlCQUF5QkEsU0FBU0E7Z0JBQ2hDK0MsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtnQkFFM0RBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBO29CQUNaQSxhQUFhQSxFQUFFQSxtQkFBbUJBO29CQUNsQ0EsUUFBUUEsRUFBRUEsSUFBSUE7b0JBQ2RBLE9BQU9BLEVBQUVBO3dCQUNQQSxpQkFBaUJBLEVBQUVBOzRCQUNqQkEsU0FBU0EsRUFBRUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsQ0FBQ0E7eUJBQ3hEQTtxQkFDRkE7aUJBQ0ZBLENBQUNBO2dCQUVGQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDN0RBLElBQUlBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDaENBLENBQUNBO1FBQ0gvQyxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUNOQSxDQUFDQSxFQTdCTSxTQUFTLEtBQVQsU0FBUyxRQTZCZiIsImZpbGUiOiJjb21waWxlZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8tdXRpbGl0aWVzL2RlZnMuZC50c1wiLz5cbiIsIm1vZHVsZSBEYXNoYm9hcmQge1xuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGFzaGJvYXJkU2VydmljZSB7XG4gICAgaGFzRGFzaGJvYXJkOmJvb2xlYW47XG4gICAgaW5EYXNoYm9hcmQ6Ym9vbGVhbjtcbiAgICBnZXRBZGRMaW5rKHRpdGxlPzpzdHJpbmcsIHdpZHRoPzpudW1iZXIsIGhlaWdodD86bnVtYmVyKTpzdHJpbmc7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFNlYXJjaE1hcCB7XG4gICAgW25hbWU6IHN0cmluZ106IHN0cmluZztcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGFzaGJvYXJkV2lkZ2V0IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgcm93PzogbnVtYmVyO1xuICAgIGNvbD86IG51bWJlcjtcbiAgICBzaXplX3g/OiBudW1iZXI7XG4gICAgc2l6ZV95PzogbnVtYmVyO1xuICAgIHBhdGg/OiBzdHJpbmc7XG4gICAgdXJsPzogc3RyaW5nO1xuICAgIGluY2x1ZGU/OiBzdHJpbmc7XG4gICAgc2VhcmNoPzogU2VhcmNoTWFwXG4gICAgcm91dGVQYXJhbXM/OiBzdHJpbmc7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIERhc2hib2FyZCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB0aXRsZTogc3RyaW5nO1xuICAgIGdyb3VwOiBzdHJpbmc7XG4gICAgd2lkZ2V0czogQXJyYXk8RGFzaGJvYXJkV2lkZ2V0PjtcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGVmYXVsdERhc2hib2FyZHMge1xuICAgIGFkZDogKGRhc2hiYXJkOkRhc2hib2FyZCkgPT4gdm9pZDtcbiAgICByZW1vdmU6IChpZDpzdHJpbmcpID0+IERhc2hib2FyZDtcbiAgICBnZXRBbGw6ICgpID0+IEFycmF5PERhc2hib2FyZD47XG4gIH1cblxuICAvKipcbiAgICogQmFzZSBpbnRlcmZhY2UgdGhhdCBkYXNoYm9hcmQgcmVwb3NpdG9yaWVzIG11c3QgaW1wbGVtZW50XG4gICAqXG4gICAqIEBjbGFzcyBEYXNoYm9hcmRSZXBvc2l0b3J5XG4gICAqL1xuICBleHBvcnQgaW50ZXJmYWNlIERhc2hib2FyZFJlcG9zaXRvcnkge1xuICAgIHB1dERhc2hib2FyZHM6IChhcnJheTphbnlbXSwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSA9PiBhbnk7XG4gICAgZGVsZXRlRGFzaGJvYXJkczogKGFycmF5OkFycmF5PERhc2hib2FyZD4sIGZuKSA9PiBhbnk7XG4gICAgZ2V0RGFzaGJvYXJkczogKGZuOihkYXNoYm9hcmRzOiBBcnJheTxEYXNoYm9hcmQ+KSA9PiB2b2lkKSA9PiB2b2lkO1xuICAgIGdldERhc2hib2FyZDogKGlkOnN0cmluZywgZm46IChkYXNoYm9hcmQ6IERhc2hib2FyZCkgPT4gdm9pZCkgPT4gYW55O1xuICAgIGNyZWF0ZURhc2hib2FyZDogKG9wdGlvbnM6YW55KSA9PiBhbnk7XG4gICAgY2xvbmVEYXNoYm9hcmQ6KGRhc2hib2FyZDphbnkpID0+IGFueTtcbiAgICBnZXRUeXBlOigpID0+IHN0cmluZztcbiAgfVxuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkSW50ZXJmYWNlcy50c1wiLz5cbi8qKlxuICogQG1vZHVsZSBEYXNoYm9hcmRcbiAqL1xubW9kdWxlIERhc2hib2FyZCB7XG5cbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KCdEYXNoYm9hcmQnKTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY2xlYW5lZCB1cCB2ZXJzaW9uIG9mIHRoZSBkYXNoYm9hcmQgZGF0YSB3aXRob3V0IGFueSBVSSBzZWxlY3Rpb24gc3RhdGVcbiAgICogQG1ldGhvZCBjbGVhbkRhc2hib2FyZERhdGFcbiAgICogQHN0YXRpY1xuICAgKiBAZm9yIERhc2hib2FyZFxuICAgKiBAcGFyYW0ge2FueX0gaXRlbVxuICAgKiBAcmV0dXJuIHthbnl9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gY2xlYW5EYXNoYm9hcmREYXRhKGl0ZW0pIHtcbiAgICB2YXIgY2xlYW5JdGVtID0ge307XG4gICAgYW5ndWxhci5mb3JFYWNoKGl0ZW0sICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBpZiAoIWFuZ3VsYXIuaXNTdHJpbmcoa2V5KSB8fCAoIWtleS5zdGFydHNXaXRoKFwiJFwiKSAmJiAha2V5LnN0YXJ0c1dpdGgoXCJfXCIpKSkge1xuICAgICAgICBjbGVhbkl0ZW1ba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBjbGVhbkl0ZW07XG4gIH1cblxuICAvKipcbiAgICogUnVucyBkZWNvZGVVUklDb21wb25lbnQoKSBvbiBlYWNoIHZhbHVlIGluIHRoZSBvYmplY3RcbiAgICogQG1ldGhvZCBkZWNvZGVVUklDb21wb25lbnRQcm9wZXJ0aWVzXG4gICAqIEBzdGF0aWNcbiAgICogQGZvciBEYXNoYm9hcmRcbiAgICogQHBhcmFtIHthbnl9IGhhc2hcbiAgICogQHJldHVybiB7YW55fVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVVSSUNvbXBvbmVudFByb3BlcnRpZXMoaGFzaCkge1xuICAgIGlmICghaGFzaCkge1xuICAgICAgcmV0dXJuIGhhc2g7XG4gICAgfVxuICAgIHZhciBkZWNvZGVIYXNoID0ge307XG4gICAgYW5ndWxhci5mb3JFYWNoKGhhc2gsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBkZWNvZGVIYXNoW2tleV0gPSB2YWx1ZSA/IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkgOiB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVjb2RlSGFzaDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBvbk9wZXJhdGlvbkNvbXBsZXRlKHJlc3VsdCkge1xuICAgIGNvbnNvbGUubG9nKFwiQ29tcGxldGVkIGFkZGluZyB0aGUgZGFzaGJvYXJkIHdpdGggcmVzcG9uc2UgXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbW9kdWxlIERhc2hib2FyZFxuICogQG1haW4gRGFzaGJvYXJkXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJkYXNoYm9hcmRIZWxwZXJzLnRzXCIvPlxubW9kdWxlIERhc2hib2FyZCB7XG4gIFxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9ICdwbHVnaW5zL2Rhc2hib2FyZC9odG1sLyc7XG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9ICdkYXNoYm9hcmQnO1xuICBcbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgW10pO1xuXG4gIF9tb2R1bGUuY29uZmlnKFtcIiRyb3V0ZVByb3ZpZGVyXCIsIFwiJHByb3ZpZGVcIiwgKCRyb3V0ZVByb3ZpZGVyLCAkcHJvdmlkZSkgPT4ge1xuXG4gICAgJHByb3ZpZGUuZGVjb3JhdG9yKCdIYXd0aW9EYXNoYm9hcmQnLCBbJyRkZWxlZ2F0ZScsICgkZGVsZWdhdGUpID0+IHtcbiAgICAgICRkZWxlZ2F0ZVsnaGFzRGFzaGJvYXJkJ10gPSB0cnVlO1xuICAgICAgJGRlbGVnYXRlWydnZXRBZGRMaW5rJ10gPSAodGl0bGU/OnN0cmluZywgc2l6ZV94PzpudW1iZXIsIHNpemVfeT86bnVtYmVyKSA9PiB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgVVJJKCcvZGFzaGJvYXJkL2FkZCcpO1xuICAgICAgICB2YXIgY3VycmVudFVyaSA9IG5ldyBVUkkoKTtcbiAgICAgICAgLypcbiAgICAgICAgY3VycmVudFVyaS5yZW1vdmVRdWVyeSgnbWFpbi10YWInKTtcbiAgICAgICAgY3VycmVudFVyaS5yZW1vdmVRdWVyeSgnc3ViLXRhYicpO1xuICAgICAgICAqL1xuICAgICAgICB2YXIgd2lkZ2V0VXJpID0gbmV3IFVSSShjdXJyZW50VXJpLnBhdGgoKSk7XG4gICAgICAgIHdpZGdldFVyaS5xdWVyeShjdXJyZW50VXJpLnF1ZXJ5KHRydWUpKTtcbiAgICAgICAgdGFyZ2V0LnF1ZXJ5KChxdWVyeSkgPT4ge1xuICAgICAgICAgIHF1ZXJ5LmhyZWYgPSB3aWRnZXRVcmkudG9TdHJpbmcoKS5lc2NhcGVVUkwoKVxuICAgICAgICAgIGlmICh0aXRsZSkge1xuICAgICAgICAgICAgcXVlcnkudGl0bGUgPSB0aXRsZS5lc2NhcGVVUkwoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNpemVfeCAmJiBzaXplX3kpIHtcbiAgICAgICAgICAgIHF1ZXJ5LnNpemUgPSBhbmd1bGFyLnRvSnNvbih7c2l6ZV94OiBzaXplX3gsIHNpemVfeTogc2l6ZV95fSkuZXNjYXBlVVJMKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC50b1N0cmluZygpO1xuICAgICAgfVxuICAgICAgcmV0dXJuICRkZWxlZ2F0ZTtcbiAgICB9XSk7XG5cbiAgICAkcm91dGVQcm92aWRlci5cbiAgICAgICAgICAgIHdoZW4oJy9kYXNoYm9hcmQvYWRkJywge3RlbXBsYXRlVXJsOiBEYXNoYm9hcmQudGVtcGxhdGVQYXRoICsgJ2FkZFRvRGFzaGJvYXJkLmh0bWwnfSkuXG4gICAgICAgICAgICB3aGVuKCcvZGFzaGJvYXJkL2VkaXQnLCB7dGVtcGxhdGVVcmw6IERhc2hib2FyZC50ZW1wbGF0ZVBhdGggKyAnZWRpdERhc2hib2FyZHMuaHRtbCd9KS5cbiAgICAgICAgICAgIHdoZW4oJy9kYXNoYm9hcmQvaWR4LzpkYXNoYm9hcmRJbmRleCcsIHt0ZW1wbGF0ZVVybDogRGFzaGJvYXJkLnRlbXBsYXRlUGF0aCArICdkYXNoYm9hcmQuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZSB9KS5cbiAgICAgICAgICAgIHdoZW4oJy9kYXNoYm9hcmQvaWQvOmRhc2hib2FyZElkJywge3RlbXBsYXRlVXJsOiBEYXNoYm9hcmQudGVtcGxhdGVQYXRoICsgJ2Rhc2hib2FyZC5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlIH0pLlxuICAgICAgICAgICAgd2hlbignL2Rhc2hib2FyZC9pZC86ZGFzaGJvYXJkSWQvc2hhcmUnLCB7dGVtcGxhdGVVcmw6IERhc2hib2FyZC50ZW1wbGF0ZVBhdGggKyAnc2hhcmUuaHRtbCd9KS5cbiAgICAgICAgICAgIHdoZW4oJy9kYXNoYm9hcmQvaW1wb3J0Jywge3RlbXBsYXRlVXJsOiBEYXNoYm9hcmQudGVtcGxhdGVQYXRoICsgJ2ltcG9ydC5odG1sJ30pO1xuICB9XSk7XG5cbiAgX21vZHVsZS52YWx1ZSgndWkuY29uZmlnJywge1xuICAgIC8vIFRoZSB1aS1qcSBkaXJlY3RpdmUgbmFtZXNwYWNlXG4gICAganE6IHtcbiAgICAgIGdyaWRzdGVyOiB7XG4gICAgICAgIHdpZGdldF9tYXJnaW5zOiBbMTAsIDEwXSxcbiAgICAgICAgd2lkZ2V0X2Jhc2VfZGltZW5zaW9uczogWzE0MCwgMTQwXVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgdmFyIHRhYiA9IHVuZGVmaW5lZDtcblxuICBleHBvcnQgZnVuY3Rpb24gc2V0U3ViVGFicyhidWlsZGVyLCBkYXNoYm9hcmRzOkFycmF5PERhc2hib2FyZD4sICRyb290U2NvcGUpIHtcbiAgICBsb2cuZGVidWcoXCJVcGRhdGluZyBzdWItdGFic1wiKTtcbiAgICBpZiAoIXRhYi50YWJzKSB7XG4gICAgICB0YWIudGFicyA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YWIudGFicy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICBfLmZvckVhY2goZGFzaGJvYXJkcywgKGRhc2hib2FyZCkgPT4ge1xuICAgICAgdmFyIGNoaWxkID0gYnVpbGRlclxuICAgICAgICAuaWQoJ2Rhc2hib2FyZC0nICsgZGFzaGJvYXJkLmlkKVxuICAgICAgICAudGl0bGUoKCkgPT4gZGFzaGJvYXJkLnRpdGxlIHx8IGRhc2hib2FyZC5pZClcbiAgICAgICAgLmhyZWYoKCkgPT4ge1xuICAgICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFVybEhlbHBlcnMuam9pbignL2Rhc2hib2FyZC9pZCcsIGRhc2hib2FyZC5pZCkpXG4gICAgICAgICAgICB1cmkuc2VhcmNoKHtcbiAgICAgICAgICAgICAgJ21haW4tdGFiJzogcGx1Z2luTmFtZSxcbiAgICAgICAgICAgICAgJ3N1Yi10YWInOiAnZGFzaGJvYXJkLScgKyBkYXNoYm9hcmQuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiB1cmkudG9TdHJpbmcoKTtcbiAgICAgICAgfSlcbiAgICAgIC5idWlsZCgpO1xuICAgICAgdGFiLnRhYnMucHVzaChjaGlsZCk7XG4gICAgfSk7XG4gICAgdmFyIG1hbmFnZSA9IGJ1aWxkZXJcbiAgICAgIC5pZCgnZGFzaGJvYXJkLW1hbmFnZScpXG4gICAgICAudGl0bGUoKCkgPT4gJzxpIGNsYXNzPVwiZmEgZmEtcGVuY2lsXCI+PC9pPiZuYnNwO01hbmFnZScpXG4gICAgICAuaHJlZigoKSA9PiAnL2Rhc2hib2FyZC9lZGl0P21haW4tdGFiPWRhc2hib2FyZCZzdWItdGFiPWRhc2hib2FyZC1tYW5hZ2UnKVxuICAgICAgLmJ1aWxkKCk7XG4gICAgdGFiLnRhYnMucHVzaChtYW5hZ2UpO1xuICAgIHRhYi50YWJzLmZvckVhY2goKHRhYikgPT4ge1xuICAgICAgdGFiLmlzU2VsZWN0ZWQgPSAoKSA9PiB7XG4gICAgICAgIHZhciBpZCA9IHRhYi5pZC5yZXBsYWNlKCdkYXNoYm9hcmQtJywgJycpO1xuICAgICAgICB2YXIgdXJpID0gbmV3IFVSSSgpO1xuICAgICAgICByZXR1cm4gdXJpLnF1ZXJ5KHRydWUpWydzdWItdGFiJ10gPT09IHRhYi5pZCB8fCBfLmVuZHNXaXRoKHVyaS5wYXRoKCksIGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBDb3JlLiRhcHBseSgkcm9vdFNjb3BlKTtcbiAgfVxuXG4gIF9tb2R1bGUucnVuKFtcIkhhd3Rpb05hdlwiLCBcImRhc2hib2FyZFJlcG9zaXRvcnlcIiwgXCIkcm9vdFNjb3BlXCIsIFwiSGF3dGlvRGFzaGJvYXJkXCIsIFwiJHRpbWVvdXRcIiwgKG5hdjpIYXd0aW9NYWluTmF2LlJlZ2lzdHJ5LCBkYXNoYm9hcmRzOkRhc2hib2FyZFJlcG9zaXRvcnksICRyb290U2NvcGUsIGRhc2g6RGFzaGJvYXJkU2VydmljZSwgJHRpbWVvdXQpID0+IHtcbiAgICAvLyBzcGVjaWFsIGNhc2UgaGVyZSwgd2UgZG9uJ3Qgd2FudCB0byBvdmVyd3JpdGUgb3VyIHN0b3JlZCB0YWIhXG4gICAgaWYgKCFkYXNoLmluRGFzaGJvYXJkKSB7XG4gICAgICB2YXIgYnVpbGRlciA9IG5hdi5idWlsZGVyKCk7XG4gICAgICB0YWIgPSBidWlsZGVyLmlkKHBsdWdpbk5hbWUpXG4gICAgICAgIC5ocmVmKCgpID0+ICcvZGFzaGJvYXJkL2lkeC8wJylcbiAgICAgICAgLnRpdGxlKCgpID0+ICdEYXNoYm9hcmQnKVxuICAgICAgICAuYnVpbGQoKTtcbiAgICAgIG5hdi5hZGQodGFiKTtcbiAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgZGFzaGJvYXJkcy5nZXREYXNoYm9hcmRzKChkYXNoYm9hcmRzKSA9PiB7XG4gICAgICAgICAgc2V0U3ViVGFicyhidWlsZGVyLCBkYXNoYm9hcmRzLCAkcm9vdFNjb3BlKTtcbiAgICAgICAgfSk7XG4gICAgICB9LCA1MDApO1xuICAgIH1cbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkUGx1Z2luLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImRhc2hib2FyZEludGVyZmFjZXMudHNcIi8+XG4vKipcbiAqIEBtb2R1bGUgRGFzaGJvYXJkXG4gKi9cbm1vZHVsZSBEYXNoYm9hcmQge1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnZGFzaGJvYXJkUmVwb3NpdG9yeScsIFsnRGVmYXVsdERhc2hib2FyZHMnLCAoZGVmYXVsdHM6RGVmYXVsdERhc2hib2FyZHMpID0+IHtcbiAgICByZXR1cm4gbmV3IExvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeShkZWZhdWx0cyk7XG4gIH1dKTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ0RlZmF1bHREYXNoYm9hcmRzJywgWygpID0+IHtcbiAgICB2YXIgZGVmYXVsdHMgPSA8QXJyYXk8RGFzaGJvYXJkPj5bXTtcbiAgICB2YXIgYW5zd2VyID0ge1xuICAgICAgYWRkOiAoZGFzaGJvYXJkOkRhc2hib2FyZCkgPT4ge1xuICAgICAgICBkZWZhdWx0cy5wdXNoKGRhc2hib2FyZCk7XG4gICAgICB9LFxuICAgICAgcmVtb3ZlOiAoaWQ6c3RyaW5nKSA9PiB7XG4gICAgICAgIHJldHVybiBfLnJlbW92ZShkZWZhdWx0cywgKGRhc2hib2FyZCkgPT4gZGFzaGJvYXJkLmlkID09PSBpZCk7XG4gICAgICB9LFxuICAgICAgZ2V0QWxsOiAoKSA9PiBkZWZhdWx0c1xuICAgIH1cbiAgICByZXR1cm4gYW5zd2VyO1xuICB9XSk7XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBMb2NhbERhc2hib2FyZFJlcG9zaXRvcnlcbiAgICogQHVzZXMgRGFzaGJvYXJkUmVwb3NpdG9yeVxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIExvY2FsRGFzaGJvYXJkUmVwb3NpdG9yeSBpbXBsZW1lbnRzIERhc2hib2FyZFJlcG9zaXRvcnkge1xuXG4gICAgcHJpdmF0ZSBsb2NhbFN0b3JhZ2U6V2luZG93TG9jYWxTdG9yYWdlID0gbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgZGVmYXVsdHM6RGVmYXVsdERhc2hib2FyZHMpIHtcbiAgICAgIHRoaXMubG9jYWxTdG9yYWdlID0gQ29yZS5nZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgIC8qXG4gICAgICBpZiAoJ3VzZXJEYXNoYm9hcmRzJyBpbiB0aGlzLmxvY2FsU3RvcmFnZSkge1xuICAgICAgICBsb2cuZGVidWcoXCJGb3VuZCBwcmV2aW91c2x5IHNhdmVkIGRhc2hib2FyZHNcIik7XG4gICAgICAgIGlmICh0aGlzLmxvYWREYXNoYm9hcmRzKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5zdG9yZURhc2hib2FyZHMoZGVmYXVsdHMuZ2V0QWxsKCkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0b3JlRGFzaGJvYXJkcyhkZWZhdWx0cy5nZXRBbGwoKSk7XG4gICAgICB9XG4gICAgICAqL1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9hZERhc2hib2FyZHMoKSB7XG4gICAgICB2YXIgYW5zd2VyID0gYW5ndWxhci5mcm9tSnNvbihsb2NhbFN0b3JhZ2VbJ3VzZXJEYXNoYm9hcmRzJ10pO1xuICAgICAgaWYgKCFhbnN3ZXIgfHwgYW5zd2VyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBhbnN3ZXIgPSB0aGlzLmRlZmF1bHRzLmdldEFsbCgpO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwicmV0dXJuaW5nIGRhc2hib2FyZHM6IFwiLCBhbnN3ZXIpO1xuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIHN0b3JlRGFzaGJvYXJkcyhkYXNoYm9hcmRzOmFueVtdKSB7XG4gICAgICBsb2cuZGVidWcoXCJzdG9yaW5nIGRhc2hib2FyZHM6IFwiLCBkYXNoYm9hcmRzKTtcbiAgICAgIGxvY2FsU3RvcmFnZVsndXNlckRhc2hib2FyZHMnXSA9IGFuZ3VsYXIudG9Kc29uKGRhc2hib2FyZHMpO1xuICAgICAgcmV0dXJuIHRoaXMubG9hZERhc2hib2FyZHMoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHV0RGFzaGJvYXJkcyhhcnJheTphbnlbXSwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgZGFzaGJvYXJkcyA9IHRoaXMubG9hZERhc2hib2FyZHMoKTtcbiAgICAgIGFycmF5LmZvckVhY2goKGRhc2gpID0+IHtcbiAgICAgICAgdmFyIGV4aXN0aW5nID0gZGFzaGJvYXJkcy5maW5kSW5kZXgoKGQpID0+IHsgcmV0dXJuIGQuaWQgPT09IGRhc2guaWQ7IH0pO1xuICAgICAgICBpZiAoZXhpc3RpbmcgPj0gMCkge1xuICAgICAgICAgIGRhc2hib2FyZHNbZXhpc3RpbmddID0gZGFzaDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkYXNoYm9hcmRzLnB1c2goZGFzaCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgZm4odGhpcy5zdG9yZURhc2hib2FyZHMoZGFzaGJvYXJkcykpO1xuICAgIH1cblxuICAgIHB1YmxpYyBkZWxldGVEYXNoYm9hcmRzKGFycmF5OmFueVtdLCBmbikge1xuICAgICAgdmFyIGRhc2hib2FyZHMgPSB0aGlzLmxvYWREYXNoYm9hcmRzKCk7XG4gICAgICBhbmd1bGFyLmZvckVhY2goYXJyYXksIChpdGVtKSA9PiB7XG4gICAgICAgIGRhc2hib2FyZHMucmVtb3ZlKChpKSA9PiB7IHJldHVybiBpLmlkID09PSBpdGVtLmlkOyB9KTtcbiAgICAgIH0pO1xuICAgICAgZm4odGhpcy5zdG9yZURhc2hib2FyZHMoZGFzaGJvYXJkcykpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXREYXNoYm9hcmRzKGZuKSB7XG4gICAgICBmbih0aGlzLmxvYWREYXNoYm9hcmRzKCkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXREYXNoYm9hcmQoaWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIGRhc2hib2FyZHMgPSB0aGlzLmxvYWREYXNoYm9hcmRzKCk7XG4gICAgICB2YXIgZGFzaGJvYXJkID0gZGFzaGJvYXJkcy5maW5kKChkYXNoYm9hcmQpID0+IHsgcmV0dXJuIGRhc2hib2FyZC5pZCA9PT0gaWQgfSk7XG4gICAgICBmbihkYXNoYm9hcmQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBjcmVhdGVEYXNoYm9hcmQob3B0aW9uczphbnkpIHtcbiAgICAgIHZhciBhbnN3ZXIgPXtcbiAgICAgICAgdGl0bGU6IFwiTmV3IERhc2hib2FyZFwiLFxuICAgICAgICBncm91cDogXCJQZXJzb25hbFwiLFxuICAgICAgICB3aWRnZXRzOiBbXVxuICAgICAgfTtcbiAgICAgIGFuc3dlciA9IGFuZ3VsYXIuZXh0ZW5kKGFuc3dlciwgb3B0aW9ucyk7XG4gICAgICBhbnN3ZXJbJ2lkJ10gPSBDb3JlLmdldFVVSUQoKTtcbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgcHVibGljIGNsb25lRGFzaGJvYXJkKGRhc2hib2FyZDphbnkpIHtcbiAgICAgIHZhciBuZXdEYXNoYm9hcmQgPSBPYmplY3QuY2xvbmUoZGFzaGJvYXJkKTtcbiAgICAgIG5ld0Rhc2hib2FyZFsnaWQnXSA9IENvcmUuZ2V0VVVJRCgpO1xuICAgICAgbmV3RGFzaGJvYXJkWyd0aXRsZSddID0gXCJDb3B5IG9mIFwiICsgZGFzaGJvYXJkLnRpdGxlO1xuICAgICAgcmV0dXJuIG5ld0Rhc2hib2FyZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0VHlwZSgpIHtcbiAgICAgIHJldHVybiAnY29udGFpbmVyJztcbiAgICB9XG4gIH1cblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cImRhc2hib2FyZFBsdWdpbi50c1wiLz5cbi8qKlxuICogQG1vZHVsZSBEYXNoYm9hcmRcbiAqL1xubW9kdWxlIERhc2hib2FyZCB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiRGFzaGJvYXJkLkVkaXREYXNoYm9hcmRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm91dGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm9vdFNjb3BlXCIsIFwiZGFzaGJvYXJkUmVwb3NpdG9yeVwiLCBcIkhhd3Rpb05hdlwiLCBcIiR0aW1lb3V0XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbW9kYWxcIiwgKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkcm91dGUsICRsb2NhdGlvbiwgJHJvb3RTY29wZSwgZGFzaGJvYXJkUmVwb3NpdG9yeTpEYXNoYm9hcmRSZXBvc2l0b3J5LCBuYXYsICR0aW1lb3V0LCAkdGVtcGxhdGVDYWNoZSwgJG1vZGFsKSA9PiB7XG5cbiAgICAkc2NvcGUuX2Rhc2hib2FyZHMgPSBbXTtcblxuICAgICRyb290U2NvcGUuJG9uKCdkYXNoYm9hcmRzVXBkYXRlZCcsIGRhc2hib2FyZExvYWRlZCk7XG5cbiAgICAkc2NvcGUuaGFzVXJsID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICgkc2NvcGUudXJsKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmhhc1NlbGVjdGlvbiA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGggIT09IDA7XG4gICAgfTtcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBzaG93Q29sdW1uTWVudTogZmFsc2UsXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgZGF0YTogJ19kYXNoYm9hcmRzJyxcbiAgICAgIHNlbGVjdFdpdGhDaGVja2JveE9ubHk6IHRydWUsXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3RpdGxlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0Rhc2hib2FyZCcsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ2VkaXREYXNoYm9hcmRUaXRsZUNlbGwuaHRtbCcpKVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdncm91cCcsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdHcm91cCdcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICB9O1xuXG4gICAgdmFyIGRvVXBkYXRlID0gXy5kZWJvdW5jZSh1cGRhdGVEYXRhLCAxMCk7XG5cbiAgICAvLyBoZWxwZXJzIHNvIHdlIGNhbiBlbmFibGUvZGlzYWJsZSBwYXJ0cyBvZiB0aGUgVUkgZGVwZW5kaW5nIG9uIGhvd1xuICAgIC8vIGRhc2hib2FyZCBkYXRhIGlzIHN0b3JlZFxuICAgIC8qXG4gICAgJHNjb3BlLnVzaW5nR2l0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0VHlwZSgpID09PSAnZ2l0JztcbiAgICB9O1xuXG4gICAgJHNjb3BlLnVzaW5nRmFicmljID0gKCkgPT4ge1xuICAgICAgcmV0dXJuIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0VHlwZSgpID09PSAnZmFicmljJztcbiAgICB9O1xuXG4gICAgJHNjb3BlLnVzaW5nTG9jYWwgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gZGFzaGJvYXJkUmVwb3NpdG9yeS5nZXRUeXBlKCkgPT09ICdjb250YWluZXInO1xuICAgIH07XG5cbiAgICBpZiAoJHNjb3BlLnVzaW5nRmFicmljKCkpIHtcbiAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5jb2x1bW5EZWZzLmFkZChbe1xuICAgICAgICBmaWVsZDogJ3ZlcnNpb25JZCcsXG4gICAgICAgIGRpc3BsYXlOYW1lOiAnVmVyc2lvbidcbiAgICAgIH0sIHtcbiAgICAgICAgZmllbGQ6ICdwcm9maWxlSWQnLFxuICAgICAgICBkaXNwbGF5TmFtZTogJ1Byb2ZpbGUnXG4gICAgICB9LCB7XG4gICAgICAgIGZpZWxkOiAnZmlsZU5hbWUnLFxuICAgICAgICBkaXNwbGF5TmFtZTogJ0ZpbGUgTmFtZSdcbiAgICAgIH1dKTtcbiAgICB9XG4gICAgKi9cblxuICAgICR0aW1lb3V0KGRvVXBkYXRlLCAxMCk7XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgJHRpbWVvdXQoZG9VcGRhdGUsIDEwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5hZGRWaWV3VG9EYXNoYm9hcmQgPSAoKSA9PiB7XG4gICAgICB2YXIgbmV4dEhyZWYgPSBudWxsO1xuICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgY3VycmVudFVybCA9IG5ldyBVUkkoKTtcbiAgICAgIHZhciBjb25maWcgPSBjdXJyZW50VXJsLnF1ZXJ5KHRydWUpO1xuICAgICAgdmFyIGhyZWYgPSBjb25maWdbJ2hyZWYnXTtcbiAgICAgIHZhciBpZnJhbWUgPSBjb25maWdbJ2lmcmFtZSddO1xuICAgICAgdmFyIHR5cGUgPSAnaHJlZic7XG4gICAgICBpZiAoaHJlZikge1xuICAgICAgICBocmVmID0gaHJlZi51bmVzY2FwZVVSTCgpO1xuICAgICAgICBocmVmID0gQ29yZS50cmltTGVhZGluZyhocmVmLCAnIycpO1xuICAgICAgfSBlbHNlIGlmIChpZnJhbWUpIHtcbiAgICAgICAgaWZyYW1lID0gaWZyYW1lLnVuZXNjYXBlVVJMKCk7XG4gICAgICAgIHR5cGUgPSAnaWZyYW1lJztcbiAgICAgIH1cbiAgICAgIHZhciB3aWRnZXRVUkkgPSA8YW55PiB1bmRlZmluZWQ7XG4gICAgICBzd2l0Y2godHlwZSkge1xuICAgICAgICBjYXNlICdocmVmJzpcbiAgICAgICAgICBsb2cuZGVidWcoXCJocmVmOiBcIiwgaHJlZik7XG4gICAgICAgICAgd2lkZ2V0VVJJID0gbmV3IFVSSShocmVmKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaWZyYW1lJzpcbiAgICAgICAgICBsb2cuZGVidWcoXCJpZnJhbWU6IFwiLCBpZnJhbWUpO1xuICAgICAgICAgIHdpZGdldFVSSSA9IG5ldyBVUkkoaWZyYW1lKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBsb2cuZGVidWcoXCJ0eXBlIHVua25vd25cIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIHNpemVTdHIgPSA8YW55PiBjb25maWdbJ3NpemUnXTtcbiAgICAgIGlmIChzaXplU3RyKSB7XG4gICAgICAgIHNpemVTdHIgPSBzaXplU3RyLnVuZXNjYXBlVVJMKCk7XG4gICAgICB9XG4gICAgICB2YXIgc2l6ZSA9IGFuZ3VsYXIuZnJvbUpzb24oc2l6ZVN0cikgfHwgeyBzaXplX3g6IDEsIHNpemVfeTogMSB9O1xuICAgICAgdmFyIHRpdGxlID0gKGNvbmZpZ1sndGl0bGUnXSB8fCAnJykudW5lc2NhcGVVUkwoKTtcbiAgICAgIHZhciB0ZW1wbGF0ZVdpZGdldCA9IHtcbiAgICAgICAgaWQ6IENvcmUuZ2V0VVVJRCgpLFxuICAgICAgICByb3c6IDEsXG4gICAgICAgIGNvbDogMSxcbiAgICAgICAgc2l6ZV94OiBzaXplLnNpemVfeCxcbiAgICAgICAgc2l6ZV95OiBzaXplLnNpemVfeSxcbiAgICAgICAgdGl0bGU6IHRpdGxlXG4gICAgICB9XG4gICAgICBhbmd1bGFyLmZvckVhY2goc2VsZWN0ZWQsIChzZWxlY3RlZEl0ZW0pID0+IHtcblxuICAgICAgICB2YXIgd2lkZ2V0ID0gXy5jbG9uZURlZXAodGVtcGxhdGVXaWRnZXQpO1xuXG4gICAgICAgIGlmICghc2VsZWN0ZWRJdGVtLndpZGdldHMpIHtcbiAgICAgICAgICBzZWxlY3RlZEl0ZW0ud2lkZ2V0cyA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnaWZyYW1lJzogXG4gICAgICAgICAgICB3aWRnZXQgPSA8YW55Pl8uZXh0ZW5kKHtcbiAgICAgICAgICAgICAgaWZyYW1lOiBpZnJhbWVcbiAgICAgICAgICAgIH0sIHdpZGdldCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdocmVmJzpcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gd2lkZ2V0VVJJLnBhdGgoKTtcbiAgICAgICAgICAgIHZhciBzZWFyY2ggPSB3aWRnZXRVUkkucXVlcnkodHJ1ZSk7XG4gICAgICAgICAgICBpZiAoJHJvdXRlICYmICRyb3V0ZS5yb3V0ZXMpIHtcbiAgICAgICAgICAgICAgdmFyIHZhbHVlID0gJHJvdXRlLnJvdXRlc1t0ZXh0XTtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlVXJsID0gdmFsdWVbXCJ0ZW1wbGF0ZVVybFwiXTtcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICAgICAgICAgIHdpZGdldCA9IDxhbnk+IF8uZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGV4dCxcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZTogdGVtcGxhdGVVcmwsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBoYXNoOiBcIlwiXG4gICAgICAgICAgICAgICAgICB9LCB3aWRnZXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBtYXRjaCBVUkkgdGVtcGxhdGVzLi4uXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvLyBmaWd1cmUgb3V0IHRoZSB3aWR0aCBvZiB0aGUgZGFzaFxuICAgICAgICB2YXIgZ3JpZFdpZHRoID0gMDtcblxuICAgICAgICBzZWxlY3RlZEl0ZW0ud2lkZ2V0cy5mb3JFYWNoKCh3KSA9PiB7XG4gICAgICAgICAgdmFyIHJpZ2h0U2lkZSA9IHcuY29sICsgdy5zaXplX3g7XG4gICAgICAgICAgaWYgKHJpZ2h0U2lkZSA+IGdyaWRXaWR0aCkge1xuICAgICAgICAgICAgZ3JpZFdpZHRoID0gcmlnaHRTaWRlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIGxlZnQgPSAodykgPT4ge1xuICAgICAgICAgIHJldHVybiB3LmNvbDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcmlnaHQgPSAodykgID0+IHtcbiAgICAgICAgICByZXR1cm4gdy5jb2wgKyB3LnNpemVfeCAtIDE7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHRvcCA9ICh3KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHcucm93O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBib3R0b20gPSAodykgPT4ge1xuICAgICAgICAgIHJldHVybiB3LnJvdyArIHcuc2l6ZV95IC0gMTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY29sbGlzaW9uID0gKHcxLCB3MikgPT4ge1xuICAgICAgICAgIHJldHVybiAhKCBsZWZ0KHcyKSA+IHJpZ2h0KHcxKSB8fFxuICAgICAgICAgICAgICByaWdodCh3MikgPCBsZWZ0KHcxKSB8fFxuICAgICAgICAgICAgICB0b3AodzIpID4gYm90dG9tKHcxKSB8fFxuICAgICAgICAgICAgICBib3R0b20odzIpIDwgdG9wKHcxKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbS53aWRnZXRzLmlzRW1wdHkoKSkge1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlICghZm91bmQpIHtcbiAgICAgICAgICB3aWRnZXQuY29sID0gMTtcbiAgICAgICAgICBpZiAod2lkZ2V0LmNvbCArIHdpZGdldC5zaXplX3ggPiBncmlkV2lkdGgpIHtcbiAgICAgICAgICAgIC8vIGxldCdzIG5vdCBsb29rIGZvciBhIHBsYWNlIG5leHQgdG8gZXhpc3Rpbmcgd2lkZ2V0XG4gICAgICAgICAgICBzZWxlY3RlZEl0ZW0ud2lkZ2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHcsIGlkeCkge1xuICAgICAgICAgICAgICBpZiAod2lkZ2V0LnJvdyA8PSB3LnJvdykge1xuICAgICAgICAgICAgICAgIHdpZGdldC5yb3crKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoOyAod2lkZ2V0LmNvbCArIHdpZGdldC5zaXplX3gpIDw9IGdyaWRXaWR0aDsgd2lkZ2V0LmNvbCsrKSB7XG4gICAgICAgICAgICBpZiAoIXNlbGVjdGVkSXRlbS53aWRnZXRzLmFueSgodykgPT4ge1xuICAgICAgICAgICAgICB2YXIgYyA9IGNvbGxpc2lvbih3LCB3aWRnZXQpO1xuICAgICAgICAgICAgICByZXR1cm4gY1xuICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgd2lkZ2V0LnJvdyA9IHdpZGdldC5yb3cgKyAxXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGp1c3QgaW4gY2FzZSwga2VlcCB0aGUgc2NyaXB0IGZyb20gcnVubmluZyBhd2F5Li4uXG4gICAgICAgICAgaWYgKHdpZGdldC5yb3cgPiA1MCkge1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkc2NvcGUucm91dGVQYXJhbXMpIHtcbiAgICAgICAgICB3aWRnZXRbJ3JvdXRlUGFyYW1zJ10gPSAkc2NvcGUucm91dGVQYXJhbXM7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZWN0ZWRJdGVtLndpZGdldHMucHVzaCh3aWRnZXQpO1xuICAgICAgICBpZiAoIW5leHRIcmVmICYmIHNlbGVjdGVkSXRlbS5pZCkge1xuICAgICAgICAgIG5leHRIcmVmID0gbmV3IFVSSSgpLnBhdGgoXCIvZGFzaGJvYXJkL2lkL1wiICsgc2VsZWN0ZWRJdGVtLmlkKS5xdWVyeSh7XG4gICAgICAgICAgICAnbWFpbi10YWInOiAnZGFzaGJvYXJkJyxcbiAgICAgICAgICAgICdzdWItdGFiJzogJ2Rhc2hib2FyZC0nICsgc2VsZWN0ZWRJdGVtLmlkXG4gICAgICAgICAgfSkucmVtb3ZlUXVlcnkoJ2hyZWYnKVxuICAgICAgICAgICAgLnJlbW92ZVF1ZXJ5KCd0aXRsZScpXG4gICAgICAgICAgICAucmVtb3ZlUXVlcnkoJ2lmcmFtZScpXG4gICAgICAgICAgICAucmVtb3ZlUXVlcnkoJ3NpemUnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIG5vdyBsZXRzIHVwZGF0ZSB0aGUgYWN0dWFsIGRhc2hib2FyZCBjb25maWdcbiAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJBZGQgd2lkZ2V0XCI7XG4gICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LnB1dERhc2hib2FyZHMoc2VsZWN0ZWQsIGNvbW1pdE1lc3NhZ2UsIChkYXNoYm9hcmRzKSA9PiB7XG4gICAgICAgIC8qXG4gICAgICAgIGxvZy5kZWJ1ZyhcIlB1dCBkYXNoYm9hcmRzOiBcIiwgZGFzaGJvYXJkcyk7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5leHQgaHJlZjogXCIsIG5leHRIcmVmLnRvU3RyaW5nKCkpO1xuICAgICAgICAqL1xuICAgICAgICBpZiAobmV4dEhyZWYpIHtcbiAgICAgICAgICAkbG9jYXRpb24ucGF0aChuZXh0SHJlZi5wYXRoKCkpLnNlYXJjaChuZXh0SHJlZi5xdWVyeSh0cnVlKSk7XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNyZWF0ZSA9ICgpID0+IHtcblxuICAgICAgdmFyIGNvdW50ZXIgPSBkYXNoYm9hcmRzKCkubGVuZ3RoICsgMTtcbiAgICAgIHZhciB0aXRsZSA9IFwiVW50aXRsZWRcIiArIGNvdW50ZXI7XG5cbiAgICAgIHZhciBtb2RhbCA9ICRtb2RhbC5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGVVcmw6IFVybEhlbHBlcnMuam9pbih0ZW1wbGF0ZVBhdGgsICdjcmVhdGVEYXNoYm9hcmRNb2RhbC5odG1sJyksXG4gICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRtb2RhbEluc3RhbmNlJywgKCRzY29wZSwgJG1vZGFsSW5zdGFuY2UpID0+IHtcbiAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICAgICAgdGl0bGU6IHRpdGxlXG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS5jb25maWcgPSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICd0aXRsZSc6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgJHNjb3BlLm9rID0gKCkgPT4ge1xuICAgICAgICAgICAgbW9kYWwuY2xvc2UoKTtcbiAgICAgICAgICAgIHZhciB0aXRsZSA9ICRzY29wZS5lbnRpdHkudGl0bGVcbiAgICAgICAgICAgIHZhciBuZXdEYXNoID0gZGFzaGJvYXJkUmVwb3NpdG9yeS5jcmVhdGVEYXNoYm9hcmQoeyB0aXRsZTogdGl0bGUgfSk7XG4gICAgICAgICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LnB1dERhc2hib2FyZHMoW25ld0Rhc2hdLCBcIkNyZWF0ZWQgbmV3IGRhc2hib2FyZDogXCIgKyB0aXRsZSwgKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgICAgICAgLy8gbGV0J3MganVzdCBiZSBzYWZlIGFuZCBlbnN1cmUgdGhlcmUncyBubyBzZWxlY3Rpb25zXG4gICAgICAgICAgICAgIGRlc2VsZWN0QWxsKCk7XG4gICAgICAgICAgICAgIHNldFN1YlRhYnMobmF2LmJ1aWxkZXIoKSwgZGFzaGJvYXJkcywgJHJvb3RTY29wZSk7XG4gICAgICAgICAgICAgIGRhc2hib2FyZExvYWRlZChudWxsLCBkYXNoYm9hcmRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgICAgICAgbW9kYWwuZGlzbWlzcygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfV1cbiAgICAgIH0pO1xuICAgICAgLypcbiAgICAgIHZhciBjb3VudGVyID0gZGFzaGJvYXJkcygpLmxlbmd0aCArIDE7XG4gICAgICB2YXIgdGl0bGUgPSBcIlVudGl0bGVkXCIgKyBjb3VudGVyO1xuICAgICAgdmFyIG5ld0Rhc2ggPSBkYXNoYm9hcmRSZXBvc2l0b3J5LmNyZWF0ZURhc2hib2FyZCh7dGl0bGU6IHRpdGxlfSk7XG5cbiAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyhbbmV3RGFzaF0sIFwiQ3JlYXRlZCBuZXcgZGFzaGJvYXJkOiBcIiArIHRpdGxlLCAoZGFzaGJvYXJkcykgPT4ge1xuICAgICAgICAvLyBsZXQncyBqdXN0IGJlIHNhZmUgYW5kIGVuc3VyZSB0aGVyZSdzIG5vIHNlbGVjdGlvbnNcbiAgICAgICAgZGVzZWxlY3RBbGwoKTtcbiAgICAgICAgc2V0U3ViVGFicyhuYXYuYnVpbGRlcigpLCBkYXNoYm9hcmRzLCAkcm9vdFNjb3BlKTtcbiAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgfSk7XG4gICAgICAqL1xuXG4gICAgfTtcblxuICAgICRzY29wZS5kdXBsaWNhdGUgPSAoKSA9PiB7XG4gICAgICB2YXIgbmV3RGFzaGJvYXJkcyA9IFtdO1xuICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIkR1cGxpY2F0ZWQgZGFzaGJvYXJkKHMpIFwiO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLCAoaXRlbSwgaWR4KSA9PiB7XG4gICAgICAgIC8vIGxldHMgdW5zZWxlY3QgdGhpcyBpdGVtXG4gICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJEdXBsaWNhdGVkIGRhc2hib2FyZCBcIiArIGl0ZW0udGl0bGU7XG4gICAgICAgIHZhciBuZXdEYXNoID0gZGFzaGJvYXJkUmVwb3NpdG9yeS5jbG9uZURhc2hib2FyZChpdGVtKTtcbiAgICAgICAgbmV3RGFzaGJvYXJkcy5wdXNoKG5ld0Rhc2gpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGxldCdzIGp1c3QgYmUgc2FmZSBhbmQgZW5zdXJlIHRoZXJlJ3Mgbm8gc2VsZWN0aW9uc1xuICAgICAgZGVzZWxlY3RBbGwoKTtcblxuICAgICAgY29tbWl0TWVzc2FnZSA9IGNvbW1pdE1lc3NhZ2UgKyBuZXdEYXNoYm9hcmRzLm1hcCgoZCkgPT4geyByZXR1cm4gZC50aXRsZSB9KS5qb2luKCcsJyk7XG4gICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LnB1dERhc2hib2FyZHMobmV3RGFzaGJvYXJkcywgY29tbWl0TWVzc2FnZSwgKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgc2V0U3ViVGFicyhuYXYuYnVpbGRlcigpLCBkYXNoYm9hcmRzLCAkcm9vdFNjb3BlKTtcbiAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZW5hbWVEYXNoYm9hcmQgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9IDxhbnk+Xy5maXJzdCgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICAgIHZhciBtb2RhbCA9ICRtb2RhbC5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ3JlbmFtZURhc2hib2FyZE1vZGFsLmh0bWwnKSxcbiAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckbW9kYWxJbnN0YW5jZScsICgkc2NvcGUsICRtb2RhbEluc3RhbmNlKSA9PiB7XG4gICAgICAgICAgICAkc2NvcGUuY29uZmlnID0ge1xuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgJ3RpdGxlJzoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICBkZWZhdWx0OiBzZWxlY3RlZC50aXRsZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgICAgICAgICAgJHNjb3BlLm9rID0gKCkgPT4ge1xuICAgICAgICAgICAgICBtb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LnB1dERhc2hib2FyZHMoWyRzY29wZS5zZWxlY3RlZF0sICdyZW5hbWVkIGRhc2hib2FyZCcsIChkYXNoYm9hcmRzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gbGV0J3MganVzdCBiZSBzYWZlIGFuZCBlbnN1cmUgdGhlcmUncyBubyBzZWxlY3Rpb25zXG4gICAgICAgICAgICAgICAgZGVzZWxlY3RBbGwoKTtcbiAgICAgICAgICAgICAgICBzZXRTdWJUYWJzKG5hdi5idWlsZGVyKCksIGRhc2hib2FyZHMsICRyb290U2NvcGUpO1xuICAgICAgICAgICAgICAgIGRhc2hib2FyZExvYWRlZChudWxsLCBkYXNoYm9hcmRzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgICAgICAgICBtb2RhbC5kaXNtaXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfV1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kZWxldGVEYXNoYm9hcmQgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmhhc1NlbGVjdGlvbigpKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgICB2YXIgbW9kYWwgPSAkbW9kYWwub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGVVcmw6IFVybEhlbHBlcnMuam9pbih0ZW1wbGF0ZVBhdGgsICdkZWxldGVEYXNoYm9hcmRNb2RhbC5odG1sJyksXG4gICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJG1vZGFsSW5zdGFuY2UnLCAoJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSkgPT4ge1xuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgICAkc2NvcGUub2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIG1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkuZGVsZXRlRGFzaGJvYXJkcygkc2NvcGUuc2VsZWN0ZWQsIChkYXNoYm9hcmRzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gbGV0J3MganVzdCBiZSBzYWZlIGFuZCBlbnN1cmUgdGhlcmUncyBubyBzZWxlY3Rpb25zXG4gICAgICAgICAgICAgICAgZGVzZWxlY3RBbGwoKTtcbiAgICAgICAgICAgICAgICBzZXRTdWJUYWJzKG5hdi5idWlsZGVyKCksIGRhc2hib2FyZHMsICRyb290U2NvcGUpO1xuICAgICAgICAgICAgICAgIGRhc2hib2FyZExvYWRlZChudWxsLCBkYXNoYm9hcmRzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgICAgICAgICBtb2RhbC5kaXNtaXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfV1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5naXN0ID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGlkID0gJHNjb3BlLnNlbGVjdGVkSXRlbXNbMF0uaWQ7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKFwiL2Rhc2hib2FyZC9pZC9cIiArIGlkICsgXCIvc2hhcmVcIik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICB2YXIgdXJsID0gJHJvdXRlUGFyYW1zW1wiaHJlZlwiXTtcbiAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgJHNjb3BlLnVybCA9IGRlY29kZVVSSUNvbXBvbmVudCh1cmwpO1xuICAgICAgfVxuXG4gICAgICB2YXIgcm91dGVQYXJhbXMgPSAkcm91dGVQYXJhbXNbXCJyb3V0ZVBhcmFtc1wiXTtcbiAgICAgIGlmIChyb3V0ZVBhcmFtcykge1xuICAgICAgICAkc2NvcGUucm91dGVQYXJhbXMgPSBkZWNvZGVVUklDb21wb25lbnQocm91dGVQYXJhbXMpO1xuICAgICAgfVxuICAgICAgdmFyIHNpemU6YW55ID0gJHJvdXRlUGFyYW1zW1wic2l6ZVwiXTtcbiAgICAgIGlmIChzaXplKSB7XG4gICAgICAgIHNpemUgPSBkZWNvZGVVUklDb21wb25lbnQoc2l6ZSk7XG4gICAgICAgICRzY29wZS5wcmVmZXJyZWRTaXplID0gYW5ndWxhci5mcm9tSnNvbihzaXplKTtcbiAgICAgIH1cbiAgICAgIHZhciB0aXRsZTphbnkgPSAkcm91dGVQYXJhbXNbXCJ0aXRsZVwiXTtcbiAgICAgIGlmICh0aXRsZSkge1xuICAgICAgICB0aXRsZSA9IGRlY29kZVVSSUNvbXBvbmVudCh0aXRsZSk7XG4gICAgICAgICRzY29wZS53aWRnZXRUaXRsZSA9IHRpdGxlO1xuICAgICAgfVxuXG4gICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LmdldERhc2hib2FyZHMoKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGFzaGJvYXJkTG9hZGVkKGV2ZW50LCBkYXNoYm9hcmRzKSB7XG4gICAgICBkYXNoYm9hcmRzLmZvckVhY2goKGRhc2hib2FyZCkgPT4ge1xuICAgICAgICBkYXNoYm9hcmQuaGFzaCA9ICc/bWFpbi10YWI9ZGFzaGJvYXJkJnN1Yi10YWI9ZGFzaGJvYXJkLScgKyBkYXNoYm9hcmQuaWQ7XG4gICAgICB9KTtcbiAgICAgICRzY29wZS5fZGFzaGJvYXJkcyA9IGRhc2hib2FyZHM7XG5cbiAgICAgIGlmIChldmVudCA9PT0gbnVsbCkge1xuICAgICAgICAkc2NvcGUuJGVtaXQoJ2Rhc2hib2FyZHNVcGRhdGVkJywgZGFzaGJvYXJkcyk7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkcm9vdFNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXNoYm9hcmRzKCkge1xuICAgICAgcmV0dXJuICRzY29wZS5fZGFzaGJvYXJkcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXNlbGVjdEFsbCgpIHtcbiAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJkYXNoYm9hcmRIZWxwZXJzLnRzXCIvPlxuLyoqXG4gKiBAbW9kdWxlIERhc2hib2FyZFxuICovXG5tb2R1bGUgRGFzaGJvYXJkIHtcblxuICAvKipcbiAgICogSW1wbGVtZW50cyB0aGUgbmcuSUxvY2F0aW9uU2VydmljZSBpbnRlcmZhY2UgYW5kIGlzIHVzZWQgYnkgdGhlIGRhc2hib2FyZCB0byBzdXBwbHlcbiAgICogY29udHJvbGxlcnMgd2l0aCBhIHNhdmVkIFVSTCBsb2NhdGlvblxuICAgKlxuICAgKiBAY2xhc3MgUmVjdGFuZ2xlTG9jYXRpb25cbiAgICovXG4gIGV4cG9ydCBjbGFzcyBSZWN0YW5nbGVMb2NhdGlvbiB7IC8vIFRPRE8gaW1wbGVtZW50cyBuZy5JTG9jYXRpb25TZXJ2aWNlIHtcbiAgICBwcml2YXRlIF9wYXRoOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfaGFzaDogc3RyaW5nO1xuICAgIHByaXZhdGUgX3NlYXJjaDogYW55O1xuICAgIHByaXZhdGUgdXJpOlVSSTtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBkZWxlZ2F0ZTpuZy5JTG9jYXRpb25TZXJ2aWNlLCBwYXRoOnN0cmluZywgc2VhcmNoLCBoYXNoOnN0cmluZykge1xuICAgICAgdGhpcy5fcGF0aCA9IHBhdGg7XG4gICAgICB0aGlzLl9zZWFyY2ggPSBzZWFyY2g7XG4gICAgICB0aGlzLl9oYXNoID0gaGFzaDtcbiAgICAgIHRoaXMudXJpID0gbmV3IFVSSShwYXRoKTtcbiAgICAgIHRoaXMudXJpLnNlYXJjaCgocXVlcnkpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlYXJjaDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGFic1VybCgpIHtcbiAgICAgIHJldHVybiB0aGlzLnByb3RvY29sKCkgKyB0aGlzLmhvc3QoKSArIFwiOlwiICsgdGhpcy5wb3J0KCkgKyB0aGlzLnBhdGgoKSArIHRoaXMuc2VhcmNoKCk7XG4gICAgfVxuXG4gICAgaGFzaChuZXdIYXNoOnN0cmluZyA9IG51bGwpOmFueSB7XG4gICAgICBpZiAobmV3SGFzaCkge1xuICAgICAgICB0aGlzLnVyaS5zZWFyY2gobmV3SGFzaCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX2hhc2g7XG4gICAgfVxuXG4gICAgaG9zdCgpOnN0cmluZyB7XG4gICAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5ob3N0KCk7XG4gICAgfVxuXG4gICAgcGF0aChuZXdQYXRoOnN0cmluZyA9IG51bGwpOmFueSB7XG4gICAgICBpZiAobmV3UGF0aCkge1xuICAgICAgICB0aGlzLnVyaS5wYXRoKG5ld1BhdGgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl9wYXRoO1xuICAgIH1cblxuICAgIHBvcnQoKTpudW1iZXIge1xuICAgICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUucG9ydCgpO1xuICAgIH1cblxuICAgIHByb3RvY29sKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUucG9ydCgpO1xuICAgIH1cblxuICAgIHJlcGxhY2UoKSB7XG4gICAgICAvLyBUT0RPXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBzZWFyY2gocGFyYW1ldGVyc01hcDphbnkgPSBudWxsKTphbnkge1xuICAgICAgaWYgKHBhcmFtZXRlcnNNYXApIHtcbiAgICAgICAgdGhpcy51cmkuc2VhcmNoKHBhcmFtZXRlcnNNYXApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl9zZWFyY2g7XG4gICAgfVxuXG4gICAgdXJsKG5ld1ZhbHVlOiBzdHJpbmcgPSBudWxsKTphbnkge1xuICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgIHRoaXMudXJpID0gbmV3IFVSSShuZXdWYWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuYWJzVXJsKCk7XG4gICAgfVxuXG4gIH1cbn1cbiIsIi8qKlxuICogQG1vZHVsZSBEYXNoYm9hcmRcbiAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImRhc2hib2FyZFBsdWdpbi50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJkYXNoYm9hcmRSZXBvc2l0b3J5LnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cInJlY3RhbmdsZUxvY2F0aW9uLnRzXCIvPlxubW9kdWxlIERhc2hib2FyZCB7XG5cbiAgdmFyIG1vZHVsZXM6QXJyYXk8c3RyaW5nPiA9IHVuZGVmaW5lZDtcblxuICBfbW9kdWxlLmRpcmVjdGl2ZSgnaGF3dGlvRGFzaGJvYXJkJywgZnVuY3Rpb24oKSB7XG4gICAgbW9kdWxlcyA9IGhhd3Rpb1BsdWdpbkxvYWRlclsnbW9kdWxlcyddLmZpbHRlcigobmFtZSkgPT4ge1xuICAgICAgcmV0dXJuIF8uaXNTdHJpbmcobmFtZSkgJiYgbmFtZSAhPT0gJ25nJztcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IERhc2hib2FyZC5Hcmlkc3RlckRpcmVjdGl2ZSgpO1xuICB9KTtcblxuICBleHBvcnQgY2xhc3MgR3JpZHN0ZXJEaXJlY3RpdmUge1xuICAgIHB1YmxpYyByZXN0cmljdCA9ICdBJztcbiAgICBwdWJsaWMgcmVwbGFjZSA9IHRydWU7XG5cbiAgICBwdWJsaWMgY29udHJvbGxlciA9IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsIFwiJGF0dHJzXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJkYXNoYm9hcmRSZXBvc2l0b3J5XCIsIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVSZXF1ZXN0XCIsIFwiJGludGVycG9sYXRlXCIsIFwiJG1vZGFsXCIsIFwiJHNjZVwiLCBcIiR0aW1lb3V0XCIsICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgZGFzaGJvYXJkUmVwb3NpdG9yeTpEYXNoYm9hcmRSZXBvc2l0b3J5LCAkY29tcGlsZSwgJHRlbXBsYXRlUmVxdWVzdCwgJGludGVycG9sYXRlLCAkbW9kYWwsICRzY2UsICR0aW1lb3V0KSA9PiB7XG5cbiAgICAgIHZhciBncmlkU2l6ZSA9IDE1MDtcbiAgICAgIHZhciBncmlkTWFyZ2luID0gNjtcbiAgICAgIHZhciBncmlkSGVpZ2h0O1xuXG4gICAgICB2YXIgZ3JpZFggPSBncmlkU2l6ZTtcbiAgICAgIHZhciBncmlkWSA9IGdyaWRTaXplO1xuXG4gICAgICB2YXIgd2lkZ2V0TWFwID0ge307XG5cbiAgICAgIHZhciBkYXNoYm9hcmRSZXBvc2l0b3J5OkRhc2hib2FyZFJlcG9zaXRvcnkgPSAkc2NvcGUuJGV2YWwoJ2Rhc2hib2FyZFJlcG9zaXRvcnknKSB8fCBkYXNoYm9hcmRSZXBvc2l0b3J5O1xuXG4gICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpZGdldE1hcCwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICBpZiAoJ3Njb3BlJyBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIHNjb3BlID0gdmFsdWVbJ3Njb3BlJ107XG4gICAgICAgICAgICBzY29wZS4kZGVzdHJveSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgc2V0VGltZW91dCh1cGRhdGVXaWRnZXRzLCAxMCk7XG5cbiAgICAgIGZ1bmN0aW9uIHJlbW92ZVdpZGdldCh3aWRnZXQpIHtcbiAgICAgICAgdmFyIGdyaWRzdGVyID0gZ2V0R3JpZHN0ZXIoKTtcbiAgICAgICAgdmFyIHdpZGdldEVsZW0gPSBudWxsO1xuXG4gICAgICAgIC8vIGxldHMgZGVzdHJveSB0aGUgd2lkZ2V0cydzIHNjb3BlXG4gICAgICAgIHZhciB3aWRnZXREYXRhID0gd2lkZ2V0TWFwW3dpZGdldC5pZF07XG4gICAgICAgIGlmICh3aWRnZXREYXRhKSB7XG4gICAgICAgICAgZGVsZXRlIHdpZGdldE1hcFt3aWRnZXQuaWRdO1xuICAgICAgICAgIHdpZGdldEVsZW0gPSB3aWRnZXREYXRhLndpZGdldDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXdpZGdldEVsZW0pIHtcbiAgICAgICAgICAvLyBsZXRzIGdldCB0aGUgbGkgcGFyZW50IGVsZW1lbnQgb2YgdGhlIHRlbXBsYXRlXG4gICAgICAgICAgd2lkZ2V0RWxlbSA9ICRlbGVtZW50LmZpbmQoXCJbZGF0YS13aWRnZXRJZD0nXCIgKyB3aWRnZXQuaWQgKyBcIiddXCIpLnBhcmVudCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChncmlkc3RlciAmJiB3aWRnZXRFbGVtKSB7XG4gICAgICAgICAgZ3JpZHN0ZXIucmVtb3ZlX3dpZGdldCh3aWRnZXRFbGVtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBsZXRzIHRyYXNoIHRoZSBKU09OIG1ldGFkYXRhXG4gICAgICAgIGlmICgkc2NvcGUuZGFzaGJvYXJkKSB7XG4gICAgICAgICAgdmFyIHdpZGdldHMgPSAkc2NvcGUuZGFzaGJvYXJkLndpZGdldHM7XG4gICAgICAgICAgaWYgKHdpZGdldHMpIHtcbiAgICAgICAgICAgIHdpZGdldHMucmVtb3ZlKHdpZGdldCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlRGFzaGJvYXJkUmVwb3NpdG9yeShcIlJlbW92ZWQgd2lkZ2V0IFwiICsgd2lkZ2V0LnRpdGxlKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGNoYW5nZVdpZGdldFNpemUod2lkZ2V0LCBzaXplZnVuYywgc2F2ZWZ1bmMpIHtcbiAgICAgICAgaWYgKCF3aWRnZXQpIHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJ3aWRnZXQgdW5kZWZpbmVkXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZ3JpZHN0ZXIgPSBnZXRHcmlkc3RlcigpO1xuICAgICAgICBsb2cuZGVidWcoXCJXaWRnZXQgSUQ6IFwiLCB3aWRnZXQuaWQsIFwiIHdpZGdldE1hcDogXCIsIHdpZGdldE1hcCk7XG4gICAgICAgIHZhciBlbnRyeSA9IHdpZGdldE1hcFt3aWRnZXQuaWRdO1xuICAgICAgICB2YXIgdyA9IGVudHJ5LndpZGdldDtcbiAgICAgICAgc2l6ZWZ1bmMoZW50cnkpO1xuICAgICAgICBncmlkc3Rlci5yZXNpemVfd2lkZ2V0KHcsIGVudHJ5LnNpemVfeCwgZW50cnkuc2l6ZV95KTtcbiAgICAgICAgZ3JpZHN0ZXIuc2V0X2RvbV9ncmlkX2hlaWdodCgpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBzYXZlZnVuYyh3aWRnZXQpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG9uV2lkZ2V0UmVuYW1lZCh3aWRnZXQpIHtcbiAgICAgICAgdXBkYXRlRGFzaGJvYXJkUmVwb3NpdG9yeShcIlJlbmFtZWQgd2lkZ2V0IHRvIFwiICsgd2lkZ2V0LnRpdGxlKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZVdpZGdldHMoKSB7XG4gICAgICAgICRzY29wZS5pZCA9ICRzY29wZS4kZXZhbCgnZGFzaGJvYXJkSWQnKSB8fCAkcm91dGVQYXJhbXNbXCJkYXNoYm9hcmRJZFwiXTtcbiAgICAgICAgJHNjb3BlLmlkeCA9ICRzY29wZS4kZXZhbCgnZGFzaGJvYXJkSW5kZXgnKSB8fCAkcm91dGVQYXJhbXNbXCJkYXNoYm9hcmRJbmRleFwiXTtcbiAgICAgICAgaWYgKCRzY29wZS5pZCkge1xuICAgICAgICAgICRzY29wZS4kZW1pdCgnbG9hZERhc2hib2FyZHMnKTtcbiAgICAgICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LmdldERhc2hib2FyZCgkc2NvcGUuaWQsIG9uRGFzaGJvYXJkTG9hZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGFzaGJvYXJkUmVwb3NpdG9yeS5nZXREYXNoYm9hcmRzKChkYXNoYm9hcmRzKSA9PiB7XG4gICAgICAgICAgICAkc2NvcGUuJGVtaXQoJ2Rhc2hib2FyZHNVcGRhdGVkJywgZGFzaGJvYXJkcyk7XG5cbiAgICAgICAgICAgIHZhciBpZHggPSAkc2NvcGUuaWR4ID8gcGFyc2VJbnQoJHNjb3BlLmlkeCkgOiAwO1xuICAgICAgICAgICAgdmFyIGlkID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChkYXNoYm9hcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgdmFyIGRhc2hib2FyZCA9IGRhc2hib2FyZHMubGVuZ3RoID4gaWR4ID8gZGFzaGJvYXJkc1tpZHhdIDogZGFzaGJvYXJkWzBdO1xuICAgICAgICAgICAgICBpZCA9IGRhc2hib2FyZC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkc2NvcGUuJGV2YWwoJ2Rhc2hib2FyZEVtYmVkZGVkJykpIHtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKFwiL2Rhc2hib2FyZC9pZC9cIiArIGlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKFwiL2Rhc2hib2FyZC9lZGl0XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvbkRhc2hib2FyZExvYWQoZGFzaGJvYXJkKSB7XG4gICAgICAgICRzY29wZS5kYXNoYm9hcmQgPSBkYXNoYm9hcmQ7XG4gICAgICAgIHZhciB3aWRnZXRzID0gKChkYXNoYm9hcmQpID8gZGFzaGJvYXJkLndpZGdldHMgOiBudWxsKSB8fCBbXTtcblxuICAgICAgICB2YXIgbWluSGVpZ2h0ID0gMTA7XG4gICAgICAgIHZhciBtaW5XaWR0aCA9IDY7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpZGdldHMsICh3aWRnZXQpID0+IHtcbiAgICAgICAgICBpZiAoIXdpZGdldCkge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiVW5kZWZpbmVkIHdpZGdldCwgc2tpcHBpbmdcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZCh3aWRnZXQucm93KSAmJiBtaW5IZWlnaHQgPCB3aWRnZXQucm93KSB7XG4gICAgICAgICAgICBtaW5IZWlnaHQgPSB3aWRnZXQucm93ICsgMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHdpZGdldC5zaXplX3hcbiAgICAgICAgICAgICAgJiYgYW5ndWxhci5pc0RlZmluZWQod2lkZ2V0LmNvbCkpKSB7XG4gICAgICAgICAgICB2YXIgcmlnaHRFZGdlID0gd2lkZ2V0LmNvbCArIHdpZGdldC5zaXplX3g7XG4gICAgICAgICAgICBpZiAocmlnaHRFZGdlID4gbWluV2lkdGgpIHtcbiAgICAgICAgICAgICAgbWluV2lkdGggPSByaWdodEVkZ2UgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGdyaWRzdGVyID0gJGVsZW1lbnQuZ3JpZHN0ZXIoe1xuICAgICAgICAgIHdpZGdldF9tYXJnaW5zOiBbZ3JpZE1hcmdpbiwgZ3JpZE1hcmdpbl0sXG4gICAgICAgICAgd2lkZ2V0X2Jhc2VfZGltZW5zaW9uczogW2dyaWRYLCBncmlkWV0sXG4gICAgICAgICAgZXh0cmFfcm93czogbWluSGVpZ2h0LFxuICAgICAgICAgIGV4dHJhX2NvbHM6IG1pbldpZHRoLFxuICAgICAgICAgIG1heF9zaXplX3g6IG1pbldpZHRoLFxuICAgICAgICAgIG1heF9zaXplX3k6IG1pbkhlaWdodCxcbiAgICAgICAgICBkcmFnZ2FibGU6IHtcbiAgICAgICAgICAgIHN0b3A6IChldmVudCwgdWkpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHNlcmlhbGl6ZURhc2hib2FyZCgpKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRGFzaGJvYXJkUmVwb3NpdG9yeShcIkNoYW5naW5nIGRhc2hib2FyZCBsYXlvdXRcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pLmRhdGEoJ2dyaWRzdGVyJyk7XG5cbiAgICAgICAgdmFyIHRlbXBsYXRlID0gJHRlbXBsYXRlQ2FjaGUuZ2V0KFwid2lkZ2V0VGVtcGxhdGVcIik7XG4gICAgICAgIHZhciByZW1haW5pbmcgPSB3aWRnZXRzLmxlbmd0aDtcblxuICAgICAgICBmdW5jdGlvbiBtYXliZUZpbmlzaFVwKCkge1xuICAgICAgICAgIHJlbWFpbmluZyA9IHJlbWFpbmluZyAtIDE7XG4gICAgICAgICAgaWYgKHJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgICAgbWFrZVJlc2l6YWJsZSgpO1xuICAgICAgICAgICAgZ2V0R3JpZHN0ZXIoKS5lbmFibGUoKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZG9SZW1vdmVXaWRnZXQoJG1vZGFsLCB3aWRnZXQpIHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJSZW1vdmUgd2lkZ2V0OiBcIiwgd2lkZ2V0KTtcbiAgICAgICAgICB2YXIgbW9kYWwgPSAkbW9kYWwub3Blbih7XG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ2RlbGV0ZVdpZGdldE1vZGFsLmh0bWwnKSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRtb2RhbEluc3RhbmNlJywgKCRzY29wZSwgJG1vZGFsSW5zdGFuY2UpID0+IHtcbiAgICAgICAgICAgICAgJHNjb3BlLndpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgICAgJHNjb3BlLm9rID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgcmVtb3ZlV2lkZ2V0KCRzY29wZS53aWRnZXQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbW9kYWwuZGlzbWlzcygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZG9SZW5hbWVXaWRnZXQoJG1vZGFsLCB3aWRnZXQpIHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJSZW5hbWUgd2lkZ2V0OiBcIiwgd2lkZ2V0KTtcbiAgICAgICAgICB2YXIgbW9kYWwgPSAkbW9kYWwub3Blbih7XG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ3JlbmFtZVdpZGdldE1vZGFsLmh0bWwnKSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRtb2RhbEluc3RhbmNlJywgKCRzY29wZSwgJG1vZGFsSW5zdGFuY2UpID0+IHtcbiAgICAgICAgICAgICAgJHNjb3BlLndpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgICAgJHNjb3BlLmNvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAndGl0bGUnOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB3aWRnZXQudGl0bGVcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICRzY29wZS5vayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBtb2RhbC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIG9uV2lkZ2V0UmVuYW1lZCgkc2NvcGUud2lkZ2V0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsLmRpc21pc3MoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfV1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh3aWRnZXRzLCAod2lkZ2V0KSA9PiB7XG4gICAgICAgICAgdmFyIHR5cGUgPSAnaW50ZXJuYWwnO1xuICAgICAgICAgIGlmICgnaWZyYW1lJyBpbiB3aWRnZXQpIHtcbiAgICAgICAgICAgIHR5cGUgPSAnZXh0ZXJuYWwnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2V4dGVybmFsJzpcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiUmVuZGVyaW5nIGV4dGVybmFsIChpZnJhbWUpIHdpZGdldDogXCIsIHdpZGdldC50aXRsZSB8fCB3aWRnZXQuaWQpO1xuICAgICAgICAgICAgICB2YXIgc2NvcGUgPSAkc2NvcGUuJG5ldygpO1xuICAgICAgICAgICAgICBzY29wZS53aWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICAgIHNjb3BlLnJlbW92ZVdpZGdldCA9ICh3aWRnZXQpID0+IGRvUmVtb3ZlV2lkZ2V0KCRtb2RhbCwgd2lkZ2V0KTtcbiAgICAgICAgICAgICAgc2NvcGUucmVuYW1lV2lkZ2V0ID0gKHdpZGdldCkgPT4gZG9SZW5hbWVXaWRnZXQoJG1vZGFsLCB3aWRnZXQpO1xuICAgICAgICAgICAgICB2YXIgd2lkZ2V0Qm9keTphbnkgPSBhbmd1bGFyLmVsZW1lbnQoJHRlbXBsYXRlQ2FjaGUuZ2V0KCdpZnJhbWVXaWRnZXRUZW1wbGF0ZS5odG1sJykpO1xuICAgICAgICAgICAgICB2YXIgb3V0ZXJEaXYgPSBhbmd1bGFyLmVsZW1lbnQoJHRlbXBsYXRlQ2FjaGUuZ2V0KCd3aWRnZXRCbG9ja1RlbXBsYXRlLmh0bWwnKSk7XG4gICAgICAgICAgICAgIHdpZGdldEJvZHkuZmluZCgnaWZyYW1lJykuYXR0cignc3JjJywgd2lkZ2V0LmlmcmFtZSk7XG4gICAgICAgICAgICAgIG91dGVyRGl2LmFwcGVuZCgkY29tcGlsZSh3aWRnZXRCb2R5KShzY29wZSkpO1xuICAgICAgICAgICAgICB2YXIgdyA9IGdyaWRzdGVyLmFkZF93aWRnZXQob3V0ZXJEaXYsIHdpZGdldC5zaXplX3gsIHdpZGdldC5zaXplX3ksIHdpZGdldC5jb2wsIHdpZGdldC5yb3cpO1xuICAgICAgICAgICAgICB3aWRnZXRNYXBbd2lkZ2V0LmlkXSA9IHtcbiAgICAgICAgICAgICAgICB3aWRnZXQ6IHdcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgbWF5YmVGaW5pc2hVcCgpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ludGVybmFsJzogXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlJlbmRlcmluZyBpbnRlcm5hbCB3aWRnZXQ6IFwiLCB3aWRnZXQudGl0bGUgfHwgd2lkZ2V0LmlkKTtcbiAgICAgICAgICAgICAgdmFyIHBhdGggPSB3aWRnZXQucGF0aDtcbiAgICAgICAgICAgICAgdmFyIHNlYXJjaCA9IG51bGw7XG4gICAgICAgICAgICAgIGlmICh3aWRnZXQuc2VhcmNoKSB7XG4gICAgICAgICAgICAgICAgc2VhcmNoID0gRGFzaGJvYXJkLmRlY29kZVVSSUNvbXBvbmVudFByb3BlcnRpZXMod2lkZ2V0LnNlYXJjaCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHdpZGdldC5yb3V0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHNlYXJjaCwgYW5ndWxhci5mcm9tSnNvbih3aWRnZXQucm91dGVQYXJhbXMpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgaGFzaCA9IHdpZGdldC5oYXNoOyAvLyBUT0RPIGRlY29kZSBvYmplY3Q/XG4gICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IG5ldyBSZWN0YW5nbGVMb2NhdGlvbigkbG9jYXRpb24sIHBhdGgsIHNlYXJjaCwgaGFzaCk7XG4gICAgICAgICAgICAgIGlmICghd2lkZ2V0LnNpemVfeCB8fCB3aWRnZXQuc2l6ZV94IDwgMSkge1xuICAgICAgICAgICAgICAgIHdpZGdldC5zaXplX3ggPSAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICghd2lkZ2V0LnNpemVfeSB8fCB3aWRnZXQuc2l6ZV95IDwgMSkge1xuICAgICAgICAgICAgICAgIHdpZGdldC5zaXplX3kgPSAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhciB0bXBNb2R1bGVOYW1lID0gJ2Rhc2hib2FyZC0nICsgd2lkZ2V0LmlkO1xuICAgICAgICAgICAgICB2YXIgdG1wTW9kdWxlID0gYW5ndWxhci5tb2R1bGUodG1wTW9kdWxlTmFtZSwgbW9kdWxlcyk7XG4gICAgICAgICAgICAgIHRtcE1vZHVsZS5jb25maWcoWyckcHJvdmlkZScsICgkcHJvdmlkZSkgPT4ge1xuICAgICAgICAgICAgICAgICRwcm92aWRlLmRlY29yYXRvcignSGF3dGlvRGFzaGJvYXJkJywgWyckZGVsZWdhdGUnLCAnJHJvb3RTY29wZScsICgkZGVsZWdhdGUsICRyb290U2NvcGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICRkZWxlZ2F0ZS5pbkRhc2hib2FyZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gJGRlbGVnYXRlO1xuICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgICAgICAgICAkcHJvdmlkZS5kZWNvcmF0b3IoJyRsb2NhdGlvbicsIFsnJGRlbGVnYXRlJywgKCRkZWxlZ2F0ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgLy9sb2cuZGVidWcoXCJVc2luZyAkbG9jYXRpb246IFwiLCBsb2NhdGlvbik7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb247XG4gICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICAgICRwcm92aWRlLmRlY29yYXRvcignJHJvdXRlJywgWyckZGVsZWdhdGUnLCAoJGRlbGVnYXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAvLyByZWFsbHkgaGFuZHkgZm9yIGRlYnVnZ2luZywgbW9zdGx5IHRvIHRlbGwgaWYgYSB3aWRnZXQncyByb3V0ZVxuICAgICAgICAgICAgICAgICAgLy8gaXNuJ3QgYWN0dWFsbHkgYXZhaWxhYmxlIGluIHRoZSBjaGlsZCBhcHBcbiAgICAgICAgICAgICAgICAgIC8vbG9nLmRlYnVnKFwiVXNpbmcgJHJvdXRlOiBcIiwgJGRlbGVnYXRlKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiAkZGVsZWdhdGU7XG4gICAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICAgICRwcm92aWRlLmRlY29yYXRvcignJHJvdXRlUGFyYW1zJywgWyckZGVsZWdhdGUnLCAoJGRlbGVnYXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAvL2xvZy5kZWJ1ZyhcIlVzaW5nICRyb3V0ZVBhcmFtczogXCIsIHNlYXJjaCk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gc2VhcmNoO1xuICAgICAgICAgICAgICAgIH1dKTtcbiAgICAgICAgICAgICAgfV0pO1xuICAgICAgICAgICAgICB0bXBNb2R1bGUuY29udHJvbGxlcignSGF3dGlvRGFzaGJvYXJkLlRpdGxlJywgW1wiJHNjb3BlXCIsIFwiJG1vZGFsXCIsICgkc2NvcGUsICRtb2RhbCkgPT4ge1xuICAgICAgICAgICAgICAgICRzY29wZS53aWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlbW92ZVdpZGdldCA9ICh3aWRnZXQpID0+IGRvUmVtb3ZlV2lkZ2V0KCRtb2RhbCwgd2lkZ2V0KTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVuYW1lV2lkZ2V0ID0gKHdpZGdldCkgPT4gZG9SZW5hbWVXaWRnZXQoJG1vZGFsLCB3aWRnZXQpO1xuICAgICAgICAgICAgICB9XSk7XG5cbiAgICAgICAgICAgICAgdmFyIGRpdjphbnkgPSAkKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgZGl2LmF0dHIoeyAnZGF0YS13aWRnZXRJZCc6IHdpZGdldC5pZCB9KTtcbiAgICAgICAgICAgICAgdmFyIGJvZHkgPSBkaXYuZmluZCgnLndpZGdldC1ib2R5Jyk7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcImluY2x1ZGU6IFwiLCB3aWRnZXQuaW5jbHVkZSk7XG4gICAgICAgICAgICAgIHZhciB3aWRnZXRCb2R5ID0gJHRlbXBsYXRlQ2FjaGUuZ2V0KHdpZGdldC5pbmNsdWRlKTtcbiAgICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBvdXRlckRpdiA9IGFuZ3VsYXIuZWxlbWVudCgkdGVtcGxhdGVDYWNoZS5nZXQoJ3dpZGdldEJsb2NrVGVtcGxhdGUuaHRtbCcpKTtcbiAgICAgICAgICAgICAgICBib2R5Lmh0bWwod2lkZ2V0Qm9keSk7XG4gICAgICAgICAgICAgICAgb3V0ZXJEaXYuaHRtbChkaXYpO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuYm9vdHN0cmFwKGRpdiwgW3RtcE1vZHVsZU5hbWVdKTtcbiAgICAgICAgICAgICAgICB3aWRnZXRNYXBbd2lkZ2V0LmlkXSA9IHtcbiAgICAgICAgICAgICAgICAgIHdpZGdldDogZ3JpZHN0ZXIuYWRkX3dpZGdldChvdXRlckRpdiwgd2lkZ2V0LnNpemVfeCwgd2lkZ2V0LnNpemVfeSwgd2lkZ2V0LmNvbCwgd2lkZ2V0LnJvdylcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1heWJlRmluaXNoVXAoKTtcbiAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZXJpYWxpemVEYXNoYm9hcmQoKSB7XG4gICAgICAgIHZhciBncmlkc3RlciA9IGdldEdyaWRzdGVyKCk7XG4gICAgICAgIGlmIChncmlkc3Rlcikge1xuICAgICAgICAgIHZhciBkYXRhID0gZ3JpZHN0ZXIuc2VyaWFsaXplKCk7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcImdvdCBkYXRhOiBcIiArIEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcblxuICAgICAgICAgIHZhciB3aWRnZXRzID0gJHNjb3BlLmRhc2hib2FyZC53aWRnZXRzIHx8IFtdO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiV2lkZ2V0czogXCIsIHdpZGdldHMpO1xuXG4gICAgICAgICAgLy8gbGV0cyBhc3N1bWUgdGhlIGRhdGEgaXMgaW4gdGhlIG9yZGVyIG9mIHRoZSB3aWRnZXRzLi4uXG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpZGdldHMsICh3aWRnZXQsIGlkeCkgPT4ge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gZGF0YVtpZHhdO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHdpZGdldCkge1xuICAgICAgICAgICAgICAvLyBsZXRzIGNvcHkgdGhlIHZhbHVlcyBhY3Jvc3NcbiAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHZhbHVlLCAoYXR0ciwga2V5KSA9PiB3aWRnZXRba2V5XSA9IGF0dHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gbWFrZVJlc2l6YWJsZSgpIHtcbiAgICAgICAgdmFyIGJsb2NrczphbnkgPSAkKCcuZ3JpZC1ibG9jaycpO1xuICAgICAgICBibG9ja3MucmVzaXphYmxlKCdkZXN0cm95Jyk7XG5cbiAgICAgICAgYmxvY2tzLnJlc2l6YWJsZSh7XG4gICAgICAgICAgZ3JpZDogW2dyaWRTaXplICsgKGdyaWRNYXJnaW4gKiAyKSwgZ3JpZFNpemUgKyAoZ3JpZE1hcmdpbiAqIDIpXSxcbiAgICAgICAgICBhbmltYXRlOiBmYWxzZSxcbiAgICAgICAgICBtaW5XaWR0aDogZ3JpZFNpemUsXG4gICAgICAgICAgbWluSGVpZ2h0OiBncmlkU2l6ZSxcbiAgICAgICAgICBhdXRvSGlkZTogZmFsc2UsXG4gICAgICAgICAgc3RhcnQ6IGZ1bmN0aW9uKGV2ZW50LCB1aSkge1xuICAgICAgICAgICAgZ3JpZEhlaWdodCA9IGdldEdyaWRzdGVyKCkuJGVsLmhlaWdodCgpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVzaXplOiBmdW5jdGlvbihldmVudCwgdWkpIHtcbiAgICAgICAgICAgIC8vc2V0IG5ldyBncmlkIGhlaWdodCBhbG9uZyB0aGUgZHJhZ2dpbmcgcGVyaW9kXG4gICAgICAgICAgICB2YXIgZyA9IGdldEdyaWRzdGVyKCk7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSBncmlkU2l6ZSArIGdyaWRNYXJnaW4gKiAyO1xuICAgICAgICAgICAgaWYgKGV2ZW50Lm9mZnNldFkgPiBnLiRlbC5oZWlnaHQoKSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdmFyIGV4dHJhID0gTWF0aC5mbG9vcigoZXZlbnQub2Zmc2V0WSAtIGdyaWRIZWlnaHQpIC8gZGVsdGEgKyAxKTtcbiAgICAgICAgICAgICAgdmFyIG5ld0hlaWdodCA9IGdyaWRIZWlnaHQgKyBleHRyYSAqIGRlbHRhO1xuICAgICAgICAgICAgICBnLiRlbC5jc3MoJ2hlaWdodCcsIG5ld0hlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdG9wOiBmdW5jdGlvbihldmVudCwgdWkpIHtcbiAgICAgICAgICAgIHZhciByZXNpemVkID0gJCh0aGlzKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJlc2l6ZUJsb2NrKHJlc2l6ZWQpO1xuICAgICAgICAgICAgfSwgMzAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJy51aS1yZXNpemFibGUtaGFuZGxlJykuaG92ZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZ2V0R3JpZHN0ZXIoKS5kaXNhYmxlKCk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGdldEdyaWRzdGVyKCkuZW5hYmxlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICB9XG5cblxuICAgICAgZnVuY3Rpb24gcmVzaXplQmxvY2soZWxtT2JqKSB7XG4gICAgICAgIHZhciBhcmVhID0gZWxtT2JqLmZpbmQoJy53aWRnZXQtYXJlYScpO1xuICAgICAgICB2YXIgdyA9IGVsbU9iai53aWR0aCgpIC0gZ3JpZFNpemU7XG4gICAgICAgIHZhciBoID0gZWxtT2JqLmhlaWdodCgpIC0gZ3JpZFNpemU7XG5cbiAgICAgICAgZm9yICh2YXIgZ3JpZF93ID0gMTsgdyA+IDA7IHcgLT0gKGdyaWRTaXplICsgKGdyaWRNYXJnaW4gKiAyKSkpIHtcbiAgICAgICAgICBncmlkX3crKztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGdyaWRfaCA9IDE7IGggPiAwOyBoIC09IChncmlkU2l6ZSArIChncmlkTWFyZ2luICogMikpKSB7XG4gICAgICAgICAgZ3JpZF9oKys7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd2lkZ2V0ID0ge1xuICAgICAgICAgIGlkOiBhcmVhLmF0dHIoJ2RhdGEtd2lkZ2V0SWQnKVxuICAgICAgICB9O1xuXG4gICAgICAgIGNoYW5nZVdpZGdldFNpemUod2lkZ2V0LCBmdW5jdGlvbih3aWRnZXQpIHtcbiAgICAgICAgICB3aWRnZXQuc2l6ZV94ID0gZ3JpZF93O1xuICAgICAgICAgIHdpZGdldC5zaXplX3kgPSBncmlkX2g7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHdpZGdldCkge1xuICAgICAgICAgIGlmIChzZXJpYWxpemVEYXNoYm9hcmQoKSkge1xuICAgICAgICAgICAgdXBkYXRlRGFzaGJvYXJkUmVwb3NpdG9yeShcIkNoYW5nZWQgc2l6ZSBvZiB3aWRnZXQ6IFwiICsgd2lkZ2V0LmlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhc2hib2FyZFJlcG9zaXRvcnkobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgICAgIGlmICgkc2NvcGUuZGFzaGJvYXJkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICAgIGlmICgkc2NvcGUuZGFzaGJvYXJkICYmICRzY29wZS5kYXNoYm9hcmQudGl0bGUpIHtcbiAgICAgICAgICAgIGNvbW1pdE1lc3NhZ2UgKz0gXCIgb24gZGFzaGJvYXJkIFwiICsgJHNjb3BlLmRhc2hib2FyZC50aXRsZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGFzaGJvYXJkUmVwb3NpdG9yeS5wdXREYXNoYm9hcmRzKFskc2NvcGUuZGFzaGJvYXJkXSwgY29tbWl0TWVzc2FnZSwgRGFzaGJvYXJkLm9uT3BlcmF0aW9uQ29tcGxldGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldEdyaWRzdGVyKCkge1xuICAgICAgICByZXR1cm4gJGVsZW1lbnQuZ3JpZHN0ZXIoKS5kYXRhKCdncmlkc3RlcicpO1xuICAgICAgfVxuXG4gICAgfV07XG5cbiAgfVxuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkUGx1Z2luLnRzXCIvPlxuLyoqXG4gKiBAbW9kdWxlIERhc2hib2FyZFxuICovXG5tb2R1bGUgRGFzaGJvYXJkIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiRGFzaGJvYXJkLkltcG9ydENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiZGFzaGJvYXJkUmVwb3NpdG9yeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgZGFzaGJvYXJkUmVwb3NpdG9yeTpEYXNoYm9hcmRSZXBvc2l0b3J5KSA9PiB7XG4gICAgJHNjb3BlLnBsYWNlaG9sZGVyID0gXCJQYXN0ZSB0aGUgSlNPTiBoZXJlIGZvciB0aGUgZGFzaGJvYXJkIGNvbmZpZ3VyYXRpb24gdG8gaW1wb3J0Li4uXCI7XG4gICAgJHNjb3BlLnNvdXJjZSA9ICRzY29wZS5wbGFjZWhvbGRlcjtcblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiBcImphdmFzY3JpcHRcIlxuICAgICAgfVxuICAgIH07XG4gICAgLy8kc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG5cbiAgICAkc2NvcGUuaXNWYWxpZCA9ICgpID0+ICRzY29wZS5zb3VyY2UgJiYgJHNjb3BlLnNvdXJjZSAhPT0gJHNjb3BlLnBsYWNlaG9sZGVyO1xuXG4gICAgJHNjb3BlLmltcG9ydEpTT04gPSAoKSA9PiB7XG4gICAgICB2YXIganNvbiA9IFtdO1xuICAgICAgLy8gbGV0cyBwYXJzZSB0aGUgSlNPTi4uLlxuICAgICAgdHJ5IHtcbiAgICAgICAganNvbiA9IEpTT04ucGFyc2UoJHNjb3BlLnNvdXJjZSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vSGF3dGlvQ29yZS5ub3RpZmljYXRpb24oXCJlcnJvclwiLCBcIkNvdWxkIG5vdCBwYXJzZSB0aGUgSlNPTlxcblwiICsgZSk7XG4gICAgICAgIGpzb24gPSBbXTtcbiAgICAgIH1cbiAgICAgIHZhciBhcnJheSA9IFtdO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShqc29uKSkge1xuICAgICAgICBhcnJheSA9IGpzb247XG4gICAgICB9IGVsc2UgaWYgKGFuZ3VsYXIuaXNPYmplY3QoanNvbikpIHtcbiAgICAgICAgYXJyYXkucHVzaChqc29uKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFycmF5Lmxlbmd0aCkge1xuICAgICAgICAvLyBsZXRzIGVuc3VyZSB3ZSBoYXZlIHNvbWUgdmFsaWQgaWRzIGFuZCBzdHVmZi4uLlxuICAgICAgICBhbmd1bGFyLmZvckVhY2goYXJyYXksIChkYXNoLCBpbmRleCkgPT4ge1xuICAgICAgICAgIGFuZ3VsYXIuY29weShkYXNoLCBkYXNoYm9hcmRSZXBvc2l0b3J5LmNyZWF0ZURhc2hib2FyZChkYXNoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBkYXNoYm9hcmRSZXBvc2l0b3J5LnB1dERhc2hib2FyZHMoYXJyYXksIFwiSW1wb3J0ZWQgZGFzaGJvYXJkIEpTT05cIiwgRGFzaGJvYXJkLm9uT3BlcmF0aW9uQ29tcGxldGUpO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChcIi9kYXNoYm9hcmQvZWRpdFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJkYXNoYm9hcmRQbHVnaW4udHNcIi8+XG4vKipcbiAqIEBtb2R1bGUgRGFzaGJvYXJkXG4gKi9cbm1vZHVsZSBEYXNoYm9hcmQge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJEYXNoYm9hcmQuTmF2QmFyQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm9vdFNjb3BlXCIsIFwiZGFzaGJvYXJkUmVwb3NpdG9yeVwiLCAoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRyb290U2NvcGUsIGRhc2hib2FyZFJlcG9zaXRvcnk6RGFzaGJvYXJkUmVwb3NpdG9yeSkgPT4ge1xuXG4gICAgJHNjb3BlLl9kYXNoYm9hcmRzID0gW107XG5cbiAgICAkc2NvcGUuYWN0aXZlRGFzaGJvYXJkID0gJHJvdXRlUGFyYW1zWydkYXNoYm9hcmRJZCddO1xuXG4gICAgJHNjb3BlLiRvbignbG9hZERhc2hib2FyZHMnLCBsb2FkRGFzaGJvYXJkcyk7XG5cbiAgICAkc2NvcGUuJG9uKCdkYXNoYm9hcmRzVXBkYXRlZCcsIGRhc2hib2FyZExvYWRlZCk7XG5cbiAgICAkc2NvcGUuZGFzaGJvYXJkcyA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuX2Rhc2hib2FyZHNcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uVGFiUmVuYW1lZCA9IGZ1bmN0aW9uKGRhc2gpIHtcbiAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkucHV0RGFzaGJvYXJkcyhbZGFzaF0sIFwiUmVuYW1lZCBkYXNoYm9hcmRcIiwgKGRhc2hib2FyZHMpID0+IHtcbiAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGRhc2hib2FyZExvYWRlZChldmVudCwgZGFzaGJvYXJkcykge1xuICAgICAgbG9nLmRlYnVnKFwibmF2YmFyIGRhc2hib2FyZExvYWRlZDogXCIsIGRhc2hib2FyZHMpO1xuICAgICAgJHNjb3BlLl9kYXNoYm9hcmRzID0gZGFzaGJvYXJkcztcbiAgICAgIGlmIChldmVudCA9PT0gbnVsbCkge1xuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Rhc2hib2FyZHNVcGRhdGVkJywgZGFzaGJvYXJkcyk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZERhc2hib2FyZHMoZXZlbnQpIHtcbiAgICAgIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkcygoZGFzaGJvYXJkcykgPT4ge1xuICAgICAgICAvLyBwcmV2ZW50IHRoZSBicm9hZGNhc3QgZnJvbSBoYXBwZW5pbmcuLi5cbiAgICAgICAgZGFzaGJvYXJkTG9hZGVkKG51bGwsIGRhc2hib2FyZHMpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiZGFzaGJvYXJkUGx1Z2luLnRzXCIvPlxuLyoqXG4gKiBAbW9kdWxlIERhc2hib2FyZFxuICovXG5tb2R1bGUgRGFzaGJvYXJkIHtcbiAgZXhwb3J0IHZhciBTaGFyZUNvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJEYXNoYm9hcmQuU2hhcmVDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcImRhc2hib2FyZFJlcG9zaXRvcnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIGRhc2hib2FyZFJlcG9zaXRvcnk6RGFzaGJvYXJkUmVwb3NpdG9yeSkgPT4ge1xuICAgIHZhciBpZCA9ICRyb3V0ZVBhcmFtc1tcImRhc2hib2FyZElkXCJdO1xuICAgIGRhc2hib2FyZFJlcG9zaXRvcnkuZ2V0RGFzaGJvYXJkKGlkLCBvbkRhc2hib2FyZExvYWQpO1xuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBtb2RlOiB7XG4gICAgICAgICAgbmFtZTogXCJqYXZhc2NyaXB0XCJcbiAgICAgIH1cbiAgICB9O1xuICAgIC8vJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcblxuICAgIGZ1bmN0aW9uIG9uRGFzaGJvYXJkTG9hZChkYXNoYm9hcmQpIHtcbiAgICAgICRzY29wZS5kYXNoYm9hcmQgPSBEYXNoYm9hcmQuY2xlYW5EYXNoYm9hcmREYXRhKGRhc2hib2FyZCk7XG5cbiAgICAgICRzY29wZS5qc29uID0ge1xuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiaGF3dGlvIGRhc2hib2FyZHNcIixcbiAgICAgICAgXCJwdWJsaWNcIjogdHJ1ZSxcbiAgICAgICAgXCJmaWxlc1wiOiB7XG4gICAgICAgICAgXCJkYXNoYm9hcmRzLmpzb25cIjoge1xuICAgICAgICAgICAgXCJjb250ZW50XCI6IEpTT04uc3RyaW5naWZ5KCRzY29wZS5kYXNoYm9hcmQsIG51bGwsIFwiICBcIilcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zb3VyY2UgPSBKU09OLnN0cmluZ2lmeSgkc2NvcGUuZGFzaGJvYXJkLCBudWxsLCBcIiAgXCIpO1xuICAgICAgQ29yZS4kYXBwbHlOb3dPckxhdGVyKCRzY29wZSk7XG4gICAgfVxuICB9XSk7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=

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