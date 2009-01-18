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