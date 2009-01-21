/**
 * @class ApiViewport
 * @extends Ext.Viewport
 * Custom viewport for the ExtJS API docs application.  Creates and manages all required components
 */
ApiViewport = function(config) {
  var config = config || {};
  
  /**
   * @property apiPanel
   * @type ApiPanel
   * Reference to the Api Tree Panel
   */
  this.apiPanel  = new ApiPanel({
    region: 'west',
    listeners: {
      click: {
        scope: this,
        fn:    function(node, e) {
          if (node.isLeaf()) {
            e.stopEvent();
            
            //turns "output/Some.Class.Name.html" into "Some.Class.Name"
            var hash = String.format("{0}", node.attributes.href.replace("output/", "").replace(".html", ""));
            
            Ext.History.add(hash);
          };
        }
      }
    }
  });
  
  /**
   * @property mainPanel
   * @type MainPanel
   * Reference to the main panel in which API doc tabs are displayed
   */
  this.mainPanel = new MainPanel({
    region: 'center',
    listeners: {
      tabchange: {
        scope: this,
        fn:    function(tp, tab) {
          this.apiPanel.selectClass(tab.cclass);
        }
      }
    }
  });
  
  /**
   * @property headerPanel
   * @type Ext.Panel
   * Header Panel containing the top toolbar menu
   */
  this.headerPanel = new Ext.Panel({
    border: false,
    layout: 'anchor',
    region: 'north',
    cls:    'docs-header',
    height: 60,
    items: [{
      xtype:  'box',
      el:     'header',
      border: false,
      anchor: 'none -25'
    },
    new Ext.Toolbar({
      cls:   'top-toolbar',
      items: [
        ' ',
        new Ext.form.TextField({
          width: 200,
          emptyText:'Find a Class',
          listeners:{
            render: {
              scope: this,
              fn:    function(f){
                f.el.on('keydown', this.filterTree, this, {buffer: 150});
              }
            }
          }
        }), ' ', ' ',
        {
          iconCls: 'icon-expand-all',
          tooltip: 'Expand All',
          scope:   this,
          handler: function(){ this.apiPanel.root.expand(true); }
        }, '-', 
        {
          iconCls: 'icon-collapse-all',
          tooltip: 'Collapse All',
          scope:   this,
          handler: function(){ this.apiPanel.root.collapse(true); }
        }, '->', 
        {
          tooltip:'Hide Inherited Members',
          iconCls: 'icon-hide-inherited',
          enableToggle: true,
          toggleHandler : function(b, pressed){
             mainPanel[pressed ? 'addClass' : 'removeClass']('hide-inherited');
          }
        }, '-', 
        {
          tooltip: 'Expand All Members',
          iconCls: 'icon-expand-members',
          enableToggle: true,
          toggleHandler : function(b, pressed){
            mainPanel[pressed ? 'addClass' : 'removeClass']('full-details');
          }
        }]
    })]
  });
 
  Ext.applyIf(config, {
    layout: 'border',
    items:  [this.headerPanel, this.mainPanel, this.apiPanel]
  });
 
  ApiViewport.superclass.constructor.call(this, config);
  
  /**
   * @property filter
   * @type Ext.tree.TreeFilter
   * Reference to the tree filter used to filter the Classes in the Api Panel
   */
  this.filter = new Ext.tree.TreeFilter(this.apiPanel, {
    clearBlank: true,
    autoClear:  true
  });
  
  //expand the top level node
  this.apiPanel.expandPath('/root/apidocs');
};
Ext.extend(ApiViewport, Ext.Viewport, {
  
  initComponent: function() {
    
    Ext.History.on('change', function(token) {
      console.log(token);
      
      if (token) {
        // Split the token up into the class and member if specified
        var cls =    token.split('/')[0];
        var member = token.split('/')[1] || false;
        
        this.mainPanel.loadClass('output/' + cls + '.html', cls, member);
      };
    }, this);
    
    ApiViewport.superclass.initComponent.apply(this, arguments);
    
    // Check if there is a hash in the URL so we can fire off a Ext.History
    // change.
    if (document.location.hash) {
      var hash = document.location.hash.replace("#", "");
      
      // Fire off the event
      Ext.History.fireEvent('change', hash);
    };
  },
  
  hiddenPkgs: [],
  
  filterTree: function(e) {
    var text = e.target.value;
    Ext.each(this.hiddenPkgs, function(n){
      n.ui.show();
    });
    if(!text){
      this.filter.clear();
      return;
    }
    this.apiPanel.expandAll();
    
    var re = new RegExp('^' + Ext.escapeRe(text), 'i');
    this.filter.filterBy(function(n){
      return !n.attributes.isClass || re.test(n.text);
    });
    
    // hide empty packages that weren't filtered
    this.hiddenPkgs = [];
    this.apiPanel.root.cascade(function(n){
      if(!n.attributes.isClass && n.ui.ctNode.offsetHeight < 3){
        n.ui.hide();
        this.hiddenPkgs.push(n);
      }
    }, this);
  }
});

/**
 * @class ApiPanel
 * @extends Ext.tree.TreePanel
 * Customised TreePanel for display of ExtJS classes
 */
ApiPanel = function(config) {
  var config = config || {};
 
  Ext.applyIf(config, {
    id:            'api-tree',
    split:         true,
    width:         280,
    minSize:       175,
    maxSize:       500,
    collapsible:   true,
    margins:       '0 0 5 5',
    cmargins:      '0 0 0 0',
    rootVisible:   false,
    lines:         false,
    autoScroll:    true,
    animCollapse:  false,
    animate:       false,
    collapseMode:  'mini',
    collapseFirst: false,
    loader: new Ext.tree.TreeLoader({
      preloadChildren: true,
      clearOnLoad: false
    }),
    root: new Ext.tree.AsyncTreeNode({
      text:     'Ext JS',
      id:       'root',
      expanded: true,
      children: [Docs.classData]
     })
  });
 
  ApiPanel.superclass.constructor.call(this, config);
};

Ext.extend(ApiPanel, Ext.tree.TreePanel, {
  selectClass : function(cls){
    if(cls){
      var parts = cls.split('.');
      var last = parts.length-1;
      for(var i = 0; i < last; i++){ // things get nasty - static classes can have .
        var p = parts[i];
        var fc = p.charAt(0);
        var staticCls = fc.toUpperCase() == fc;
        if(p == 'Ext' || !staticCls){
          parts[i] = 'pkg-'+p;
        }else if(staticCls){
          --last;
          parts.splice(i, 1);
        }
      }
      parts[last] = cls;

      this.selectPath('/root/apidocs/'+parts.join('/'));
    }
  }
});

Ext.reg('api_tree_panel', ApiPanel);

DocPanel = Ext.extend(Ext.Panel, {
  closable:   true,
  autoScroll: true,

  initComponent : function(){
    if (this.cclass) {
      var ps = this.cclass.split('.');
      this.title = ps[ps.length-1];
    };

    DocPanel.superclass.initComponent.call(this);
  },

  scrollToMember : function(member){
    var el = Ext.fly(this.cclass + '-' + member);
    if(el){
      var top = (el.getOffsetsTo(this.body)[1]) + this.body.dom.scrollTop;
      this.body.scrollTo('top', top-25, {duration:.75, callback: this.hlMember.createDelegate(this, [member])});
    }
  },

  scrollToSection : function(id){
    var el = Ext.getDom(id);
    if(el){
      var top = (Ext.fly(el).getOffsetsTo(this.body)[1]) + this.body.dom.scrollTop;
      this.body.scrollTo('top', top-25, {duration:.5, callback: function(){
          Ext.fly(el).next('h2').pause(.2).highlight('#8DB2E3', {attr:'color'});
      }});
    }
  },

  hlMember : function(member){
    var el = Ext.fly(this.cclass + '-' + member);
    if(el){
        el.up('tr').highlight('#cadaf9');
    }
  }
});

/**
 * @class MainPanel
 * @extends Ext.TabPanel
 * Custom TabPanel which intercepts links to other API doc pages and fires events appropriately
 */
MainPanel = function(){
  
  this.searchStore = new Ext.data.Store({
    proxy: new Ext.data.ScriptTagProxy({
      url: 'http://extjs.com/playpen/api.php'
    }),
    reader: new Ext.data.JsonReader(
      {
        root: 'data'
      },
      ['cls', 'member', 'type', 'doc']
    ),
    baseParams: {},
    listeners: {
      'beforeload' : function(){
        this.baseParams.qt = Ext.getCmp('search-type').getValue();
      }
    }
  });
  
  MainPanel.superclass.constructor.call(this, {
    id:              'doc-body',
    region:          'center',
    margins:         '0 5 5 0',
    resizeTabs:      true,
    minTabWidth:     135,
    tabWidth:        135,
    plugins:         new Ext.ux.TabCloseMenu(),
    enableTabScroll: true,
    activeTab:       0,

    items: {
      autoLoad: {
        url:      'welcome.html',
        callback: this.initSearch,
        scope:    this
      },
      id:         'welcome-panel',
      title:      'API Home',
      iconCls:    'icon-docs',
      autoScroll: true,
      
      tbar: [
        'Search: ', ' ',
        new Ext.ux.SelectBox({
          listClass:    'x-combo-list-small',
          width:        90,
          value:        'Starts with',
          id:           'search-type',
          displayField: 'text',
          
          store: new Ext.data.SimpleStore({
            fields:     ['text'],
            expandData: true,
            data :      ['Starts with', 'Ends with', 'Any match']
          })
        }), ' ',
        new Ext.app.SearchField({
          width:     240,
          store:     this.searchStore,
          paramName: 'q'
        })
      ]
    }
  });
};

Ext.extend(MainPanel, Ext.TabPanel, {
  stateful:    true,
  stateEvents: ['tabchange'],
  
  /**
   * Re-opens any tabs which have been saved to state
   * @param {Object} state Array of class names to reopen
   */
  applyState: function(state) {
    for (var i=0; i < state.length; i++) {
      this.loadClass('output/' + state[i] + '.html', state[i]);
    };
  },
  
  /**
   * @property tabClassRegex
   * @type RegExp
   * Regular expression to deduce class name from tab ID (e.g. "docs-Function" becomes "Function")
   */
  tabClassRegex: /docs-([A-Za-z\.]*)/,
  
  /**
   * Retrieves state for by collecting the class names of all open tabs
   * @return {Object} Array of class names currently open (e.g. ['Function', 'Ext.dd.DragSource'])
   */
  getState: function() {
    var state = [];
    
    var matchData;
    this.items.each(function(tab) {
      //only preserve state of tabs with ids like "docs-SomeClassName"
      if (matchData = this.tabClassRegex.exec(tab.id)) {
        state.push(matchData[1]);
      };
    }, this);
    
    return state;
  },

  initEvents : function(){
    MainPanel.superclass.initEvents.call(this);
    this.body.on('click', this.onClick, this);
    
    this.on('tabchange', function(tabPanel, tab) {
      var matchData;
      if (matchData = this.tabClassRegex.exec(tab.id)) {
        // Add the history URL when clicking a method on the main panel
        // Ext.History.add(String.format("{0}", matchData[1]));
      };
    }, this);
  },

  onClick: function(e, target){
    if(target = e.getTarget('a:not(.exi)', 3)){
      var cls = Ext.fly(target).getAttributeNS('ext', 'cls');
      e.stopEvent();
      if(cls){
        var member = Ext.fly(target).getAttributeNS('ext', 'member');
        
        if (member) {
          member = "/" + member;
        } else {
          member = '';
        }
        
        // Add to the history when clicking a search result
        var hash = cls + member;
        Ext.History.add(hash);
      }else if(target.className == 'inner-link'){
        this.getActiveTab().scrollToSection(target.href.split('#')[1]);
      }else{
        console.log('href');
        // console.log(target.href);
      }
    }else if(target = e.getTarget('.micon', 2)){
      e.stopEvent();
      var tr = Ext.fly(target.parentNode);
      if(tr.hasClass('expandable')){
        tr.toggleClass('expanded');
      }
    }
  },

  loadClass : function(href, cls, member){
    var id = 'docs-' + cls;
    var tab = this.getComponent(id);
    if(tab){
      this.setActiveTab(tab);
      if(member){
        tab.scrollToMember(member);
      }
    }else{
      var autoLoad = {url: href};
      if(member){
        autoLoad.callback = function(){
          Ext.getCmp(id).scrollToMember(member);
        };
      }
      var p = this.add(new DocPanel({
        id:       id,
        cclass :  cls,
        autoLoad: autoLoad,
        iconCls:  Docs.icons[cls]
      }));
      this.setActiveTab(p);
    }
  },

  initSearch : function(){
    // Custom rendering Template for the View
    var resultTpl = new Ext.XTemplate(
      '<tpl for=".">',
        '<div class="search-item">',
          '<a class="member" ext:cls="{cls}" ext:member="{member}" href="output/{cls}.html">',
            '<img src="../resources/images/default/s.gif" class="item-icon icon-{type}"/>{member}',
          '</a> ',
          '<a class="cls" ext:cls="{cls}" href="output/{cls}.html">{cls}</a>',
          '<p>{doc}</p>',
        '</div>',
      '</tpl>'
    );
    
    var p = new Ext.DataView({
      applyTo:      'search',
      tpl:          resultTpl,
      loadingText:  'Searching...',
      store:        this.searchStore,
      itemSelector: 'div.search-item',
      emptyText:    '<h3>Use the search field above to search the Ext API for classes, properties, config options, methods and events.</h3>'
    });
  },
  
  doSearch : function(e){
    var k = e.getKey();
    if(!e.isSpecialKey()){
      var text = e.target.value;
      if(!text){
        this.searchStore.baseParams.q = '';
        this.searchStore.removeAll();
      }else{
        this.searchStore.baseParams.q = text;
        this.searchStore.reload();
      }
    }
  }
});

/**
 * Makes a ComboBox more closely mimic an HTML SELECT.  Supports clicking and dragging
 * through the list, with item selection occurring when the mouse button is released.
 * When used will automatically set {@link #editable} to false and call {@link Ext.Element#unselectable}
 * on inner elements.  Re-enabling editable after calling this will NOT work.
 *
 * @author Corey Gilmore
 * http://extjs.com/forum/showthread.php?t=6392
 *
 * @history 2007-07-08 jvs
 * Slight mods for Ext 2.0
 */
Ext.ux.SelectBox = function(config){
	this.searchResetDelay = 1000;
	config = config || {};
	config = Ext.apply(config || {}, {
		editable: false,
		forceSelection: true,
		rowHeight: false,
		lastSearchTerm: false,
        triggerAction: 'all',
        mode: 'local'
    });

	Ext.ux.SelectBox.superclass.constructor.apply(this, arguments);

	this.lastSelectedIndex = this.selectedIndex || 0;
};

Ext.extend(Ext.ux.SelectBox, Ext.form.ComboBox, {
  lazyInit: false,
	initEvents : function(){
		Ext.ux.SelectBox.superclass.initEvents.apply(this, arguments);
		// you need to use keypress to capture upper/lower case and shift+key, but it doesn't work in IE
		this.el.on('keydown', this.keySearch, this, true);
		this.cshTask = new Ext.util.DelayedTask(this.clearSearchHistory, this);
	},

	keySearch : function(e, target, options) {
		var raw = e.getKey();
		var key = String.fromCharCode(raw);
		var startIndex = 0;

		if( !this.store.getCount() ) {
			return;
		}

		switch(raw) {
			case Ext.EventObject.HOME:
				e.stopEvent();
				this.selectFirst();
				return;

			case Ext.EventObject.END:
				e.stopEvent();
				this.selectLast();
				return;

			case Ext.EventObject.PAGEDOWN:
				this.selectNextPage();
				e.stopEvent();
				return;

			case Ext.EventObject.PAGEUP:
				this.selectPrevPage();
				e.stopEvent();
				return;
		}

		// skip special keys other than the shift key
		if( (e.hasModifier() && !e.shiftKey) || e.isNavKeyPress() || e.isSpecialKey() ) {
			return;
		}
		if( this.lastSearchTerm == key ) {
			startIndex = this.lastSelectedIndex;
		}
		this.search(this.displayField, key, startIndex);
		this.cshTask.delay(this.searchResetDelay);
	},

	onRender : function(ct, position) {
		this.store.on('load', this.calcRowsPerPage, this);
		Ext.ux.SelectBox.superclass.onRender.apply(this, arguments);
		if( this.mode == 'local' ) {
			this.calcRowsPerPage();
		}
	},

	onSelect : function(record, index, skipCollapse){
		if(this.fireEvent('beforeselect', this, record, index) !== false){
			this.setValue(record.data[this.valueField || this.displayField]);
			if( !skipCollapse ) {
				this.collapse();
			}
			this.lastSelectedIndex = index + 1;
			this.fireEvent('select', this, record, index);
		}
	},

	render : function(ct) {
		Ext.ux.SelectBox.superclass.render.apply(this, arguments);
		if( Ext.isSafari ) {
			this.el.swallowEvent('mousedown', true);
		}
		this.el.unselectable();
		this.innerList.unselectable();
		this.trigger.unselectable();
		this.innerList.on('mouseup', function(e, target, options) {
			if( target.id && target.id == this.innerList.id ) {
				return;
			}
			this.onViewClick();
		}, this);

		this.innerList.on('mouseover', function(e, target, options) {
			if( target.id && target.id == this.innerList.id ) {
				return;
			}
			this.lastSelectedIndex = this.view.getSelectedIndexes()[0] + 1;
			this.cshTask.delay(this.searchResetDelay);
		}, this);

		this.trigger.un('click', this.onTriggerClick, this);
		this.trigger.on('mousedown', function(e, target, options) {
			e.preventDefault();
			this.onTriggerClick();
		}, this);

		this.on('collapse', function(e, target, options) {
			Ext.getDoc().un('mouseup', this.collapseIf, this);
		}, this, true);

		this.on('expand', function(e, target, options) {
			Ext.getDoc().on('mouseup', this.collapseIf, this);
		}, this, true);
	},

	clearSearchHistory : function() {
		this.lastSelectedIndex = 0;
		this.lastSearchTerm = false;
	},

	selectFirst : function() {
		this.focusAndSelect(this.store.data.first());
	},

	selectLast : function() {
		this.focusAndSelect(this.store.data.last());
	},

	selectPrevPage : function() {
		if( !this.rowHeight ) {
			return;
		}
		var index = Math.max(this.selectedIndex-this.rowsPerPage, 0);
		this.focusAndSelect(this.store.getAt(index));
	},

	selectNextPage : function() {
		if( !this.rowHeight ) {
			return;
		}
		var index = Math.min(this.selectedIndex+this.rowsPerPage, this.store.getCount() - 1);
		this.focusAndSelect(this.store.getAt(index));
	},

	search : function(field, value, startIndex) {
		field = field || this.displayField;
		this.lastSearchTerm = value;
		var index = this.store.find.apply(this.store, arguments);
		if( index !== -1 ) {
			this.focusAndSelect(index);
		}
	},

	focusAndSelect : function(record) {
		var index = typeof record === 'number' ? record : this.store.indexOf(record);
		this.select(index, this.isExpanded());
		this.onSelect(this.store.getAt(record), index, this.isExpanded());
	},

	calcRowsPerPage : function() {
		if( this.store.getCount() ) {
			this.rowHeight = Ext.fly(this.view.getNode(0)).getHeight();
			this.rowsPerPage = this.maxHeight / this.rowHeight;
		} else {
			this.rowHeight = false;
		}
	}

});

/**
 * Simple Search Field component
 * @class Ext.app.SearchField
 */
Ext.app.SearchField = Ext.extend(Ext.form.TwinTriggerField, {
  initComponent : function(){
    if(!this.store.baseParams){ this.store.baseParams = {}; }
    Ext.app.SearchField.superclass.initComponent.call(this);
  
    this.on('specialkey', function(f, e){
      if(e.getKey() == e.ENTER){
        this.onTrigger2Click();
      }
    }, this);
  },

  validationEvent: false,
  validateOnBlur:  false,
  trigger1Class:   'x-form-clear-trigger',
  trigger2Class:   'x-form-search-trigger',
  hideTrigger1:    true,
  width:           180,
  hasSearch :      false,
  paramName :      'query',

  onTrigger1Click : function(){
    if(this.hasSearch){
      this.store.baseParams[this.paramName] = '';
      this.store.removeAll();
      this.el.dom.value = '';
      this.triggers[0].hide();
      this.hasSearch = false;
      this.focus();
    }
  },

  onTrigger2Click : function(){
    var v = this.getRawValue();
    if(v.length < 1){
      this.onTrigger1Click();
      return;
    }
    if(v.length < 2){
      Ext.Msg.alert('Invalid Search', 'You must enter a minimum of 2 characters to search the API');
      return;
    }
    this.store.baseParams[this.paramName] = v;
    var o = {start: 0};
    this.store.reload({params:o});
    this.hasSearch = true;
    this.triggers[0].show();
    this.focus();
  }
});

// Very simple plugin for adding a close context menu to tabs
Ext.ux.TabCloseMenu = function(){
    var tabs, menu, ctxItem;
    this.init = function(tp){
        tabs = tp;
        tabs.on('contextmenu', onContextMenu);
    }

    function onContextMenu(ts, item, e){
        if(!menu){ // create context menu on first right click
            menu = new Ext.menu.Menu([{
                id: tabs.id + '-close',
                text: 'Close Tab',
                handler : function(){
                    tabs.remove(ctxItem);
                }
            },{
                id: tabs.id + '-close-others',
                text: 'Close Other Tabs',
                handler : function(){
                    tabs.items.each(function(item){
                        if(item.closable && item != ctxItem){
                            tabs.remove(item);
                        }
                    });
                }
            }]);
        }
        ctxItem = item;
        var items = menu.items;
        items.get(tabs.id + '-close').setDisabled(!item.closable);
        var disableOthers = true;
        tabs.items.each(function(){
            if(this != item && this.closable){
                disableOthers = false;
                return false;
            }
        });
        items.get(tabs.id + '-close-others').setDisabled(disableOthers);
        menu.showAt(e.getPoint());
    }
};

/**
 * This file sets up the environment for the application.
 * Use it to specify BLANK_IMAGE_URL, state provider, etc, as well as
 * starting up your application itself
 */

Ext.BLANK_IMAGE_URL = 'resources/images/s.gif';
Ext.state.Manager.setProvider(new Ext.state.CookieProvider());

Ext.onReady(function() {
  Ext.QuickTips.init();
  
  //create Ext.History elements
  Ext.getBody().createChild({  
    tag:    'form',
    action: '',  
    cls:    'x-hidden',  
    id:     'history-form',  
    children: [  
     {  
       tag: 'div',  
       children: [  
         {  
           tag:  'input',  
           id:   Ext.History.fieldId,  
           type: 'hidden'  
         },  
         {  
           tag:  'iframe',  
           id:   Ext.History.iframeId  
         }  
       ]  
     }  
    ]  
  });  
   
  //initialize History management  
  Ext.History.init();
  
  //boot up the app
  new ApiViewport().doLayout();
  
  //fade the loading mask out
  setTimeout(function(){
    Ext.get('loading').remove();
    Ext.get('loading-mask').fadeOut({remove:true});
  }, 250);
});

//Set up Analytics
Ext.Ajax.on('requestcomplete', function(ajax, xhr, o){
  if(typeof urchinTracker == 'function' && o && o.url){
    urchinTracker(o.url);
  }
});

Ext.ns('Docs');
Docs.classData = {"id":"apidocs","iconCls":"icon-docs","text":"API Documentation","singleClickExpand":true,"children":[{"id":"pkg-Ext","text":"Ext","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"id":"pkg-air","text":"air","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.air.DragType.html","text":"DragType","id":"Ext.air.DragType","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.air.FileProvider.html","text":"FileProvider","id":"Ext.air.FileProvider","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.air.NativeObservable.html","text":"NativeObservable","id":"Ext.air.NativeObservable","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.air.NativeWindow.html","text":"NativeWindow","id":"Ext.air.NativeWindow","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.air.NativeWindowGroup.html","text":"NativeWindowGroup","id":"Ext.air.NativeWindowGroup","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.air.NativeWindowManager.html","text":"NativeWindowManager","id":"Ext.air.NativeWindowManager","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.air.Sound.html","text":"Sound","id":"Ext.air.Sound","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.air.SystemMenu.html","text":"SystemMenu","id":"Ext.air.SystemMenu","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-data","text":"data","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.data.ArrayReader.html","text":"ArrayReader","id":"Ext.data.ArrayReader","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.Connection.html","text":"Connection","id":"Ext.data.Connection","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.DataProxy.html","text":"DataProxy","id":"Ext.data.DataProxy","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.DataReader.html","text":"DataReader","id":"Ext.data.DataReader","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.GroupingStore.html","text":"GroupingStore","id":"Ext.data.GroupingStore","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.HttpProxy.html","text":"HttpProxy","id":"Ext.data.HttpProxy","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.JsonReader.html","text":"JsonReader","id":"Ext.data.JsonReader","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.JsonStore.html","text":"JsonStore","id":"Ext.data.JsonStore","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.MemoryProxy.html","text":"MemoryProxy","id":"Ext.data.MemoryProxy","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.Node.html","text":"Node","id":"Ext.data.Node","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.Record.html","text":"Record","id":"Ext.data.Record","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.ScriptTagProxy.html","text":"ScriptTagProxy","id":"Ext.data.ScriptTagProxy","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.SimpleStore.html","text":"SimpleStore","id":"Ext.data.SimpleStore","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.SortTypes.html","text":"SortTypes","id":"Ext.data.SortTypes","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.data.Store.html","text":"Store","id":"Ext.data.Store","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.Tree.html","text":"Tree","id":"Ext.data.Tree","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.data.XmlReader.html","text":"XmlReader","id":"Ext.data.XmlReader","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-dd","text":"dd","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.dd.DD.html","text":"DD","id":"Ext.dd.DD","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.dd.DDProxy.html","text":"DDProxy","id":"Ext.dd.DDProxy","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.dd.DDTarget.html","text":"DDTarget","id":"Ext.dd.DDTarget","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.dd.DragDrop.html","text":"DragDrop","id":"Ext.dd.DragDrop","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.dd.DragDropMgr.html","text":"DragDropMgr","id":"Ext.dd.DragDropMgr","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.dd.DragSource.html","text":"DragSource","id":"Ext.dd.DragSource","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.dd.DragZone.html","text":"DragZone","id":"Ext.dd.DragZone","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.dd.DropTarget.html","text":"DropTarget","id":"Ext.dd.DropTarget","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.dd.DropZone.html","text":"DropZone","id":"Ext.dd.DropZone","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.dd.Registry.html","text":"Registry","id":"Ext.dd.Registry","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.dd.ScrollManager.html","text":"ScrollManager","id":"Ext.dd.ScrollManager","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.dd.StatusProxy.html","text":"StatusProxy","id":"Ext.dd.StatusProxy","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-form","text":"form","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.form.Action.html","text":"Action","id":"Ext.form.Action","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.form.Action.Load.html","text":"Action.Load","id":"Ext.form.Action.Load","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.form.Action.Submit.html","text":"Action.Submit","id":"Ext.form.Action.Submit","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.form.BasicForm.html","text":"BasicForm","id":"Ext.form.BasicForm","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.form.Checkbox.html","text":"Checkbox","id":"Ext.form.Checkbox","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.CheckboxGroup.html","text":"CheckboxGroup","id":"Ext.form.CheckboxGroup","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.ComboBox.html","text":"ComboBox","id":"Ext.form.ComboBox","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.DateField.html","text":"DateField","id":"Ext.form.DateField","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.Field.html","text":"Field","id":"Ext.form.Field","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.FieldSet.html","text":"FieldSet","id":"Ext.form.FieldSet","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.FormPanel.html","text":"FormPanel","id":"Ext.form.FormPanel","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.Hidden.html","text":"Hidden","id":"Ext.form.Hidden","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.HtmlEditor.html","text":"HtmlEditor","id":"Ext.form.HtmlEditor","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.Label.html","text":"Label","id":"Ext.form.Label","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.NumberField.html","text":"NumberField","id":"Ext.form.NumberField","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.Radio.html","text":"Radio","id":"Ext.form.Radio","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.RadioGroup.html","text":"RadioGroup","id":"Ext.form.RadioGroup","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.TextArea.html","text":"TextArea","id":"Ext.form.TextArea","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.TextField.html","text":"TextField","id":"Ext.form.TextField","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.TimeField.html","text":"TimeField","id":"Ext.form.TimeField","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.TriggerField.html","text":"TriggerField","id":"Ext.form.TriggerField","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.form.VTypes.html","text":"VTypes","id":"Ext.form.VTypes","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-grid","text":"grid","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.grid.AbstractSelectionModel.html","text":"AbstractSelectionModel","id":"Ext.grid.AbstractSelectionModel","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.CellSelectionModel.html","text":"CellSelectionModel","id":"Ext.grid.CellSelectionModel","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.CheckboxSelectionModel.html","text":"CheckboxSelectionModel","id":"Ext.grid.CheckboxSelectionModel","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.ColumnModel.html","text":"ColumnModel","id":"Ext.grid.ColumnModel","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.EditorGridPanel.html","text":"EditorGridPanel","id":"Ext.grid.EditorGridPanel","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.grid.GridDragZone.html","text":"GridDragZone","id":"Ext.grid.GridDragZone","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.GridPanel.html","text":"GridPanel","id":"Ext.grid.GridPanel","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.grid.GridView.html","text":"GridView","id":"Ext.grid.GridView","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.GroupingView.html","text":"GroupingView","id":"Ext.grid.GroupingView","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.PropertyColumnModel.html","text":"PropertyColumnModel","id":"Ext.grid.PropertyColumnModel","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.PropertyGrid.html","text":"PropertyGrid","id":"Ext.grid.PropertyGrid","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.grid.PropertyRecord.html","text":"PropertyRecord","id":"Ext.grid.PropertyRecord","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.PropertyStore.html","text":"PropertyStore","id":"Ext.grid.PropertyStore","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.RowNumberer.html","text":"RowNumberer","id":"Ext.grid.RowNumberer","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.grid.RowSelectionModel.html","text":"RowSelectionModel","id":"Ext.grid.RowSelectionModel","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-layout","text":"layout","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.layout.AbsoluteLayout.html","text":"AbsoluteLayout","id":"Ext.layout.AbsoluteLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.Accordion.html","text":"Accordion","id":"Ext.layout.Accordion","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.AnchorLayout.html","text":"AnchorLayout","id":"Ext.layout.AnchorLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.BorderLayout.html","text":"BorderLayout","id":"Ext.layout.BorderLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.BorderLayout.Region.html","text":"BorderLayout.Region","id":"Ext.layout.BorderLayout.Region","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.BorderLayout.SplitRegion.html","text":"BorderLayout.SplitRegion","id":"Ext.layout.BorderLayout.SplitRegion","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.CardLayout.html","text":"CardLayout","id":"Ext.layout.CardLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.ColumnLayout.html","text":"ColumnLayout","id":"Ext.layout.ColumnLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.ContainerLayout.html","text":"ContainerLayout","id":"Ext.layout.ContainerLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.FitLayout.html","text":"FitLayout","id":"Ext.layout.FitLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.FormLayout.html","text":"FormLayout","id":"Ext.layout.FormLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.layout.TableLayout.html","text":"TableLayout","id":"Ext.layout.TableLayout","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-menu","text":"menu","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.menu.Adapter.html","text":"Adapter","id":"Ext.menu.Adapter","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.menu.BaseItem.html","text":"BaseItem","id":"Ext.menu.BaseItem","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.menu.CheckItem.html","text":"CheckItem","id":"Ext.menu.CheckItem","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.menu.ColorItem.html","text":"ColorItem","id":"Ext.menu.ColorItem","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.menu.ColorMenu.html","text":"ColorMenu","id":"Ext.menu.ColorMenu","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.menu.DateItem.html","text":"DateItem","id":"Ext.menu.DateItem","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.menu.DateMenu.html","text":"DateMenu","id":"Ext.menu.DateMenu","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.menu.Item.html","text":"Item","id":"Ext.menu.Item","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.menu.Menu.html","text":"Menu","id":"Ext.menu.Menu","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.menu.MenuMgr.html","text":"MenuMgr","id":"Ext.menu.MenuMgr","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.menu.Separator.html","text":"Separator","id":"Ext.menu.Separator","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.menu.TextItem.html","text":"TextItem","id":"Ext.menu.TextItem","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-state","text":"state","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.state.CookieProvider.html","text":"CookieProvider","id":"Ext.state.CookieProvider","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.state.Manager.html","text":"Manager","id":"Ext.state.Manager","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.state.Provider.html","text":"Provider","id":"Ext.state.Provider","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-tree","text":"tree","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.tree.AsyncTreeNode.html","text":"AsyncTreeNode","id":"Ext.tree.AsyncTreeNode","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.DefaultSelectionModel.html","text":"DefaultSelectionModel","id":"Ext.tree.DefaultSelectionModel","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.MultiSelectionModel.html","text":"MultiSelectionModel","id":"Ext.tree.MultiSelectionModel","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.RootTreeNodeUI.html","text":"RootTreeNodeUI","id":"Ext.tree.RootTreeNodeUI","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreeDragZone.html","text":"TreeDragZone","id":"Ext.tree.TreeDragZone","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreeDropZone.html","text":"TreeDropZone","id":"Ext.tree.TreeDropZone","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreeEditor.html","text":"TreeEditor","id":"Ext.tree.TreeEditor","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreeFilter.html","text":"TreeFilter","id":"Ext.tree.TreeFilter","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreeLoader.html","text":"TreeLoader","id":"Ext.tree.TreeLoader","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreeNode.html","text":"TreeNode","id":"Ext.tree.TreeNode","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreeNodeUI.html","text":"TreeNodeUI","id":"Ext.tree.TreeNodeUI","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreePanel.html","text":"TreePanel","id":"Ext.tree.TreePanel","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.tree.TreeSorter.html","text":"TreeSorter","id":"Ext.tree.TreeSorter","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true}],"pcount":0},{"id":"pkg-util","text":"util","iconCls":"icon-pkg","cls":"package","singleClickExpand":true,"children":[{"href":"output\/Ext.util.CSS.html","text":"CSS","id":"Ext.util.CSS","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.util.ClickRepeater.html","text":"ClickRepeater","id":"Ext.util.ClickRepeater","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.util.DelayedTask.html","text":"DelayedTask","id":"Ext.util.DelayedTask","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.util.Format.html","text":"Format","id":"Ext.util.Format","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.util.JSON.html","text":"JSON","id":"Ext.util.JSON","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.util.MixedCollection.html","text":"MixedCollection","id":"Ext.util.MixedCollection","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.util.Observable.html","text":"Observable","id":"Ext.util.Observable","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.util.TaskRunner.html","text":"TaskRunner","id":"Ext.util.TaskRunner","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.util.TextMetrics.html","text":"TextMetrics","id":"Ext.util.TextMetrics","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true}],"pcount":0},{"href":"output\/Ext.Action.html","text":"Action","id":"Ext.Action","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Ajax.html","text":"Ajax","id":"Ext.Ajax","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.BoxComponent.html","text":"BoxComponent","id":"Ext.BoxComponent","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Button.html","text":"Button","id":"Ext.Button","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.ColorPalette.html","text":"ColorPalette","id":"Ext.ColorPalette","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Component.html","text":"Component","id":"Ext.Component","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.ComponentMgr.html","text":"ComponentMgr","id":"Ext.ComponentMgr","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.CompositeElement.html","text":"CompositeElement","id":"Ext.CompositeElement","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.CompositeElementLite.html","text":"CompositeElementLite","id":"Ext.CompositeElementLite","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Container.html","text":"Container","id":"Ext.Container","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.CycleButton.html","text":"CycleButton","id":"Ext.CycleButton","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.DataView.html","text":"DataView","id":"Ext.DataView","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.DatePicker.html","text":"DatePicker","id":"Ext.DatePicker","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.DomHelper.html","text":"DomHelper","id":"Ext.DomHelper","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.DomQuery.html","text":"DomQuery","id":"Ext.DomQuery","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.Editor.html","text":"Editor","id":"Ext.Editor","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Element.html","text":"Element","id":"Ext.Element","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.EventManager.html","text":"EventManager","id":"Ext.EventManager","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.EventObject.html","text":"EventObject","id":"Ext.EventObject","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.Fx.html","text":"Fx","id":"Ext.Fx","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.History.html","text":"History","id":"Ext.History","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.KeyMap.html","text":"KeyMap","id":"Ext.KeyMap","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.KeyNav.html","text":"KeyNav","id":"Ext.KeyNav","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Layer.html","text":"Layer","id":"Ext.Layer","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.LoadMask.html","text":"LoadMask","id":"Ext.LoadMask","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.MessageBox.html","text":"MessageBox","id":"Ext.MessageBox","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.PagingToolbar.html","text":"PagingToolbar","id":"Ext.PagingToolbar","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Panel.html","text":"Panel","id":"Ext.Panel","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.ProgressBar.html","text":"ProgressBar","id":"Ext.ProgressBar","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.QuickTip.html","text":"QuickTip","id":"Ext.QuickTip","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.QuickTips.html","text":"QuickTips","id":"Ext.QuickTips","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.Resizable.html","text":"Resizable","id":"Ext.Resizable","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Shadow.html","text":"Shadow","id":"Ext.Shadow","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Slider.html","text":"Slider","id":"Ext.Slider","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.SplitBar.html","text":"SplitBar","id":"Ext.SplitBar","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.SplitBar.AbsoluteLayoutAdapter.html","text":"SplitBar.AbsoluteLayoutAdapter","id":"Ext.SplitBar.AbsoluteLayoutAdapter","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.SplitBar.BasicLayoutAdapter.html","text":"SplitBar.BasicLayoutAdapter","id":"Ext.SplitBar.BasicLayoutAdapter","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.SplitButton.html","text":"SplitButton","id":"Ext.SplitButton","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.StatusBar.html","text":"StatusBar","id":"Ext.StatusBar","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.StoreMgr.html","text":"StoreMgr","id":"Ext.StoreMgr","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.TabPanel.html","text":"TabPanel","id":"Ext.TabPanel","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.TaskMgr.html","text":"TaskMgr","id":"Ext.TaskMgr","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.Template.html","text":"Template","id":"Ext.Template","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Tip.html","text":"Tip","id":"Ext.Tip","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.ToolTip.html","text":"ToolTip","id":"Ext.ToolTip","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Toolbar.html","text":"Toolbar","id":"Ext.Toolbar","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Toolbar.Button.html","text":"Toolbar.Button","id":"Ext.Toolbar.Button","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Toolbar.Fill.html","text":"Toolbar.Fill","id":"Ext.Toolbar.Fill","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Toolbar.Item.html","text":"Toolbar.Item","id":"Ext.Toolbar.Item","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Toolbar.Separator.html","text":"Toolbar.Separator","id":"Ext.Toolbar.Separator","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Toolbar.Spacer.html","text":"Toolbar.Spacer","id":"Ext.Toolbar.Spacer","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Toolbar.SplitButton.html","text":"Toolbar.SplitButton","id":"Ext.Toolbar.SplitButton","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Toolbar.TextItem.html","text":"Toolbar.TextItem","id":"Ext.Toolbar.TextItem","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Updater.html","text":"Updater","id":"Ext.Updater","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Updater.BasicRenderer.html","text":"Updater.BasicRenderer","id":"Ext.Updater.BasicRenderer","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Updater.defaults.html","text":"Updater.defaults","id":"Ext.Updater.defaults","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.Viewport.html","text":"Viewport","id":"Ext.Viewport","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.Window.html","text":"Window","id":"Ext.Window","isClass":true,"iconCls":"icon-cmp","cls":"cls","leaf":true},{"href":"output\/Ext.WindowGroup.html","text":"WindowGroup","id":"Ext.WindowGroup","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.WindowMgr.html","text":"WindowMgr","id":"Ext.WindowMgr","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Ext.XTemplate.html","text":"XTemplate","id":"Ext.XTemplate","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true}],"pcount":10},{"href":"output\/Array.html","text":"Array","id":"Array","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Date.html","text":"Date","id":"Date","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Ext.html","text":"Ext","id":"Ext","isClass":true,"iconCls":"icon-static","cls":"cls","leaf":true},{"href":"output\/Function.html","text":"Function","id":"Function","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/Number.html","text":"Number","id":"Number","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true},{"href":"output\/String.html","text":"String","id":"String","isClass":true,"iconCls":"icon-cls","cls":"cls","leaf":true}],"pcount":1};
           Docs.icons = {"Ext.Action":"icon-cls","Ext.Ajax":"icon-static","Ext.BoxComponent":"icon-cmp","Ext.Button":"icon-cmp","Ext.ColorPalette":"icon-cmp","Ext.Component":"icon-cls","Ext.ComponentMgr":"icon-static","Ext.CompositeElement":"icon-cls","Ext.CompositeElementLite":"icon-cls","Ext.Container":"icon-cmp","Ext.CycleButton":"icon-cmp","Ext.DataView":"icon-cmp","Ext.DatePicker":"icon-cmp","Ext.DomHelper":"icon-static","Ext.DomQuery":"icon-static","Ext.Editor":"icon-cmp","Ext.Element":"icon-cls","Ext.EventManager":"icon-static","Ext.EventObject":"icon-static","Ext.Fx":"icon-cls","Ext.History":"icon-static","Ext.KeyMap":"icon-cls","Ext.KeyNav":"icon-cls","Ext.Layer":"icon-cls","Ext.LoadMask":"icon-cls","Ext.MessageBox":"icon-static","Ext.PagingToolbar":"icon-cmp","Ext.Panel":"icon-cmp","Ext.ProgressBar":"icon-cmp","Ext.QuickTip":"icon-cmp","Ext.QuickTips":"icon-static","Ext.Resizable":"icon-cls","Ext.Shadow":"icon-cls","Ext.Slider":"icon-cmp","Ext.SplitBar":"icon-cls","Ext.SplitBar.AbsoluteLayoutAdapter":"icon-cls","Ext.SplitBar.BasicLayoutAdapter":"icon-cls","Ext.SplitButton":"icon-cmp","Ext.StatusBar":"icon-cmp","Ext.StoreMgr":"icon-static","Ext.TabPanel":"icon-cmp","Ext.TaskMgr":"icon-static","Ext.Template":"icon-cls","Ext.Tip":"icon-cmp","Ext.ToolTip":"icon-cmp","Ext.Toolbar":"icon-cmp","Ext.Toolbar.Button":"icon-cmp","Ext.Toolbar.Fill":"icon-cls","Ext.Toolbar.Item":"icon-cls","Ext.Toolbar.Separator":"icon-cls","Ext.Toolbar.Spacer":"icon-cls","Ext.Toolbar.SplitButton":"icon-cmp","Ext.Toolbar.TextItem":"icon-cls","Ext.Updater":"icon-cls","Ext.Updater.BasicRenderer":"icon-cls","Ext.Updater.defaults":"icon-cls","Ext.Viewport":"icon-cmp","Ext.Window":"icon-cmp","Ext.WindowGroup":"icon-cls","Ext.WindowMgr":"icon-static","Ext.XTemplate":"icon-cls","Ext.air.DragType":"icon-static","Ext.air.FileProvider":"icon-cls","Ext.air.NativeObservable":"icon-cls","Ext.air.NativeWindow":"icon-cls","Ext.air.NativeWindowGroup":"icon-cls","Ext.air.NativeWindowManager":"icon-static","Ext.air.Sound":"icon-static","Ext.air.SystemMenu":"icon-static","Ext.data.ArrayReader":"icon-cls","Ext.data.Connection":"icon-cls","Ext.data.DataProxy":"icon-cls","Ext.data.DataReader":"icon-cls","Ext.data.GroupingStore":"icon-cls","Ext.data.HttpProxy":"icon-cls","Ext.data.JsonReader":"icon-cls","Ext.data.JsonStore":"icon-cls","Ext.data.MemoryProxy":"icon-cls","Ext.data.Node":"icon-cls","Ext.data.Record":"icon-cls","Ext.data.ScriptTagProxy":"icon-cls","Ext.data.SimpleStore":"icon-cls","Ext.data.SortTypes":"icon-static","Ext.data.Store":"icon-cls","Ext.data.Tree":"icon-cls","Ext.data.XmlReader":"icon-cls","Ext.dd.DD":"icon-cls","Ext.dd.DDProxy":"icon-cls","Ext.dd.DDTarget":"icon-cls","Ext.dd.DragDrop":"icon-cls","Ext.dd.DragDropMgr":"icon-static","Ext.dd.DragSource":"icon-cls","Ext.dd.DragZone":"icon-cls","Ext.dd.DropTarget":"icon-cls","Ext.dd.DropZone":"icon-cls","Ext.dd.Registry":"icon-static","Ext.dd.ScrollManager":"icon-static","Ext.dd.StatusProxy":"icon-cls","Ext.form.Action":"icon-cls","Ext.form.Action.Load":"icon-cls","Ext.form.Action.Submit":"icon-cls","Ext.form.BasicForm":"icon-cls","Ext.form.Checkbox":"icon-cmp","Ext.form.CheckboxGroup":"icon-cmp","Ext.form.ComboBox":"icon-cmp","Ext.form.DateField":"icon-cmp","Ext.form.Field":"icon-cmp","Ext.form.FieldSet":"icon-cmp","Ext.form.FormPanel":"icon-cmp","Ext.form.Hidden":"icon-cmp","Ext.form.HtmlEditor":"icon-cmp","Ext.form.Label":"icon-cmp","Ext.form.NumberField":"icon-cmp","Ext.form.Radio":"icon-cmp","Ext.form.RadioGroup":"icon-cmp","Ext.form.TextArea":"icon-cmp","Ext.form.TextField":"icon-cmp","Ext.form.TimeField":"icon-cmp","Ext.form.TriggerField":"icon-cmp","Ext.form.VTypes":"icon-static","Ext.grid.AbstractSelectionModel":"icon-cls","Ext.grid.CellSelectionModel":"icon-cls","Ext.grid.CheckboxSelectionModel":"icon-cls","Ext.grid.ColumnModel":"icon-cls","Ext.grid.EditorGridPanel":"icon-cmp","Ext.grid.GridDragZone":"icon-cls","Ext.grid.GridPanel":"icon-cmp","Ext.grid.GridView":"icon-cls","Ext.grid.GroupingView":"icon-cls","Ext.grid.PropertyColumnModel":"icon-cls","Ext.grid.PropertyGrid":"icon-cmp","Ext.grid.PropertyRecord":"icon-cls","Ext.grid.PropertyStore":"icon-cls","Ext.grid.RowNumberer":"icon-cls","Ext.grid.RowSelectionModel":"icon-cls","Ext.layout.AbsoluteLayout":"icon-cls","Ext.layout.Accordion":"icon-cls","Ext.layout.AnchorLayout":"icon-cls","Ext.layout.BorderLayout":"icon-cls","Ext.layout.BorderLayout.Region":"icon-cls","Ext.layout.BorderLayout.SplitRegion":"icon-cls","Ext.layout.CardLayout":"icon-cls","Ext.layout.ColumnLayout":"icon-cls","Ext.layout.ContainerLayout":"icon-cls","Ext.layout.FitLayout":"icon-cls","Ext.layout.FormLayout":"icon-cls","Ext.layout.TableLayout":"icon-cls","Ext.menu.Adapter":"icon-cmp","Ext.menu.BaseItem":"icon-cmp","Ext.menu.CheckItem":"icon-cmp","Ext.menu.ColorItem":"icon-cmp","Ext.menu.ColorMenu":"icon-cls","Ext.menu.DateItem":"icon-cmp","Ext.menu.DateMenu":"icon-cls","Ext.menu.Item":"icon-cmp","Ext.menu.Menu":"icon-cls","Ext.menu.MenuMgr":"icon-static","Ext.menu.Separator":"icon-cmp","Ext.menu.TextItem":"icon-cmp","Ext.state.CookieProvider":"icon-cls","Ext.state.Manager":"icon-static","Ext.state.Provider":"icon-cls","Ext.tree.AsyncTreeNode":"icon-cls","Ext.tree.DefaultSelectionModel":"icon-cls","Ext.tree.MultiSelectionModel":"icon-cls","Ext.tree.RootTreeNodeUI":"icon-cls","Ext.tree.TreeDragZone":"icon-cls","Ext.tree.TreeDropZone":"icon-cls","Ext.tree.TreeEditor":"icon-cmp","Ext.tree.TreeFilter":"icon-cls","Ext.tree.TreeLoader":"icon-cls","Ext.tree.TreeNode":"icon-cls","Ext.tree.TreeNodeUI":"icon-cls","Ext.tree.TreePanel":"icon-cmp","Ext.tree.TreeSorter":"icon-cls","Ext.util.CSS":"icon-static","Ext.util.ClickRepeater":"icon-cls","Ext.util.DelayedTask":"icon-cls","Ext.util.Format":"icon-static","Ext.util.JSON":"icon-static","Ext.util.MixedCollection":"icon-cls","Ext.util.Observable":"icon-cls","Ext.util.TaskRunner":"icon-cls","Ext.util.TextMetrics":"icon-static","Array":"icon-cls","Date":"icon-cls","Ext":"icon-static","Function":"icon-cls","Number":"icon-cls","String":"icon-cls"};

