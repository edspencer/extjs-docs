DocPanel = Ext.extend(Ext.Panel, {
  closable:   true,
  autoScroll: true,

  initComponent : function(){
    var ps = this.cclass.split('.');
    this.title = ps[ps.length-1];

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