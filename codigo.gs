var CALENDAR_ID = "i2f9k18k4qoolpqj7gkk22l5rk@group.calendar.google.com";
var CACHE_ID = "lastUpdate2016.12";
//var CALENDAR_IDdev = "jtep1etd9a2qsq6smu2c064mmc@group.calendar.google.com";

function refreshTable() {
  try{
    var now = new Date();
    Logger.log("refreshTable: " + now);
    var schedule = UrlFetchApp.fetch("https://gamesdonequick.com/schedule/");
    if (schedule.getResponseCode() == "200"){
      Logger.log("Request OK");
      schedule = schedule.getContentText();
      schedule = schedule.slice(schedule.indexOf("<table"),schedule.lastIndexOf("</table>")+8);      
      var lastUpdate = getScheduleCached();   
      if (lastUpdate == null || !lastUpdate.equals(schedule)){
        Logger.log("refreshTable: actualizando cache y eventos");
        setEventsCalendar(schedule);
        setScheduleCache(schedule);
        sendEmailReportLog();
      }else{
        Logger.log("refreshTable: No hay cambios");
      }     
    }
  }catch(e){
    Logger.log("refreshTable: " + e);
  }
}

function setEventsCalendar(tableString){
  try{
    Logger.log("setEventsCalendar -------------");
    
    // doc[runs].td:
    // 0 "Date and Time" 
    // 1 "Game" 
    // 2 "Runners"
    // 3 "Console"
    // 4 "Estimate"
    // 5 "Setup"
    // 6 "Comments"
    // 7 "Couch Commentators"
    // 8 "Prizes"
    // 9 "Twitch Channels"
    
    var doc = Xml.parse(tableString, true);
    doc =  doc.html.body.table.tbody.tr; //trs array
    var docLength = doc.length;
    for (var runs = 0; runs < docLength; runs = runs + 2){
      //juego: 0:starttime 1:game 2:runners 3:setuptime 4:duration
      var juego = [], description = "";
      //save objects from td
      for (var runsDetail in doc[runs].td) {
        juego.push(doc[runs].td[runsDetail].Text);
      }
      //add duracion
      juego.push(doc[runs+1].td[0].Text);
      
      description = "Runner(s): " + juego[2] + "\nEstimate: " + juego[4] + "\nSetup Time: " + juego[3];
      description += "\n\nhttps://gamesdonequick.com/";
      
      var addCalendarEventStatus;
      do{
        //fechaInicio, duración, titulo, descripcion
        addCalendarEventStatus = addCalendarEvent(juego[0], juego[4], juego[1], description);
      }while(addCalendarEventStatus === "apilimit");
    }
    /*
    for (var runs in doc) {
      var juego = [];
      var description = "";
      for (var runsDetail in doc[runs].td) {
        if(runsDetail == 0 && runsDetail == 1){
          Logger.log(doc[runs].td[runsDetail].Text);
        }
        juego.push(doc[runs].td[runsDetail].Text);
      }
      
      description = "Runner: " + juego[2] + "\nConsole: " + juego[3] + "\nEstimate: " + juego[4];
      if(typeof juego[6] !== "undefined"){
        description += "\nComments: " + juego[6];
      }
      if(typeof juego[7] !== "undefined"){
        description += "\nCouch Commentators: " + juego[7];
      }
      if(typeof juego[8] !== "undefined"){
        description += "\nPrizes: " + juego[8];
      }
      if(typeof juego[9] !== "undefined"){
        description += "\nTwitch Channels: " + juego[9];
      }
      
      description += "\n\nhttps://gamesdonequick.com/";
      
      var addCalendarEventStatus;
      do{
        //fechaInicio, duración, titulo, descripcion
        addCalendarEventStatus = addCalendarEvent(juego[0], juego[4], juego[1], description);
      }while(addCalendarEventStatus === "apilimit");
    } */
    
    
    Logger.log("setEventsCalendar: Eventos guardados.");    
  }catch(e){
    Logger.log("setEventsCalendar: " + e);
  }  
}

function addCalendarEvent(fechaInicio, duracion, title, description) {
  try{
    title = title.replace(/'/g, ' ');// ' Google Calendar fix.
    title = title.replace(/\./g, '');// ' Google Calendar fix.
    /*fechaInicio = fechaInicio.split("/");
    if (fechaInicio[1] < 10){
      fechaInicio[1] = "0" + fechaInicio[1];
    }
    fechaInicio = fechaInicio[0] + "/" + fechaInicio[1] + "/" + fechaInicio[2];
    
    fechaInicio = new Date(fechaInicio + " -0500");
    
    */
    duracion = duracion.split(":");
    
    fechaInicio = fechaInicio.replace("Z", ".000Z");
    fechaInicio = new Date(fechaInicio);
    var fechaFin = new Date(fechaInicio);
    
    var segundos = fechaFin.getSeconds() + parseInt(duracion[2], '10');
    var minutos = fechaFin.getMinutes() + parseInt(duracion[1], '10');
    var horas = fechaFin.getHours() + parseInt(duracion[0], '10'); 
    
    fechaFin = new Date(fechaFin.setHours(horas, minutos, segundos));
    
    
    var eventExist = getEventIdByName(title);
    
    if(eventExist){
      Logger.log("addCalendarEvent: Event exists. Updating.");
      var eventUp = CalendarApp.getCalendarById(CALENDAR_ID).getEventSeriesById(eventExist);
      eventUp.setDescription(description);
      var recurrence = CalendarApp.newRecurrence().addDailyRule().times(1);
      eventUp.setRecurrence(recurrence, fechaInicio, fechaFin);
      
    }else{
      Logger.log("addCalendarEvent: New event. Creating.");
      var event = CalendarApp
      .getCalendarById(CALENDAR_ID)
      .createEvent(title,
                   fechaInicio,
                   fechaFin,
                   {description: description}
                  );
      Logger.log("addCalendar, evento creado: " + event.getId());
      return event.getId();
    }
  }catch(e){
   var error = e;
   Logger.log("addCalendarEvent: " + e);
   Logger.log("addCalendarEvent: API Limit, waiting 10 seconds.");
   Utilities.sleep(12000);
   return "apilimit";
  }
}

function sendEmailReportLog(){
  MailApp.sendEmail("malejandrodev@gmail.com",
                   "Games Done Quick Report",
                   Logger.getLog());
}

function getScheduleCached() {
   var cache = CacheService.getDocumentCache();
   var cached = cache.get(CACHE_ID);
   if (cached != null) {
     return cached;
   }else{
     return null;
   }
}
function setScheduleCache(text) {
  try{
    var cached = CacheService.getDocumentCache();
    cached.put(CACHE_ID, text, 21600);
  }catch(e){
    Logger.log("setScheduleCache: " + e);
  }
}

function getEventIdByName(nameEvent){
  nameEvent = nameEvent.replace(/'/g, ' ');// ' Google Calendar fix.
  nameEvent = nameEvent.replace(/\./g, '');// ' Google Calendar fix.
  Logger.log("getEventIdByName: " + nameEvent);
  var desde = new Date("1/01/2012");
  var hasta = new Date("1/01/2020");
  
  var event = CalendarApp.getCalendarById(CALENDAR_ID).
                          getEvents(desde, hasta,{search: nameEvent});
  if(event.length > 0){
    for(var x in event){
      if(event[x].getTitle() === nameEvent){
        Logger.log(event[x].getId() + " " + event[x].getTitle());
        return event[x].getId();
      }      
    }    
  }else{
    Logger.log("getEventIdByName: Event not found.");
    return null;
  }  
}