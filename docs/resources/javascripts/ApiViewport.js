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
            var cls = String.format("class={0}", node.attributes.href.replace("output/", "").replace(".html", ""));
            Ext.History.add(cls);
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
      //maintain backwards compatibility with non-History managed direct links
      //e.g. ?class=Some.Class redirects to #class=Some.Class
      if (document.location.search) {
        var loc = String.prototype.split.call(document.location, "?")[0];
        document.location = String.format("{0}#{1}", loc, document.location.search.replace("?", ""));
        return;
      }

      if (token) {
        var ps = Ext.urlDecode(token);
        this.mainPanel.loadClass('output/' + ps['class'] + '.html', ps['class'], ps.member);
      };
    }, this);
    
    ApiViewport.superclass.initComponent.apply(this, arguments);
    
    //fire a History change event to load up a class if specified in the url
    var hash = document.location.hash.replace("#", "");
    Ext.History.fireEvent('change', hash);
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