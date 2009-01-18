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