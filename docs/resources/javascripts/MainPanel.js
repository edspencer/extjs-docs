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
        Ext.History.add(String.format("class={0}", matchData[1]));
      };
    }, this);
  },

  onClick: function(e, target){
    if(target = e.getTarget('a:not(.exi)', 3)){
      var cls = Ext.fly(target).getAttributeNS('ext', 'cls');
      e.stopEvent();
      if(cls){
        var member = Ext.fly(target).getAttributeNS('ext', 'member');
        this.loadClass(target.href, cls, member);
      }else if(target.className == 'inner-link'){
        this.getActiveTab().scrollToSection(target.href.split('#')[1]);
      }else{
        window.open(target.href);
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