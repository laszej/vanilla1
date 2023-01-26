function randomRandom(){

    let randFunc = Math.random() 
    
     let lottery = randFunc <0.5 ? Math.floor(Math.random() * -100) : Math.floor(Math.random() * 100)
     return lottery}

     let dynamicValue = 0
  
     function circle(){
      function dodatnie(){
        for (let i=0;  i<=180; i++){delay(i)}
  
      function delay(i) {setTimeout(() => {
      console.log(i)
      gaugeValue = i
      drawGauge1();
      }, 50 * i );}}
   
  
   function ujemne(){
    for (let i=0;  i>=-180; i--){delay(i)}
  
   function delay(i) {setTimeout(() => {
    console.log(i)
    gaugeValue = i
    drawGauge1();
   }, 50 * -i );}}
  
  setTimeout(ujemne, 9000)
  dodatnie()}

//circle()
             
    let minimumValue = -40
   let maximumValue = 40  
   let currentValue = randomRandom()
   //let currentValue1 = randomRandom()

 //first chart ----------------------------------------------------------------------------------------------------

  // Get the canvas element
 var canvas = document.getElementById("speedometer1");
 // Set the canvas size
 canvas.width = 300;
 canvas.height = 300;
 // Get the canvas context
 var ctx = canvas.getContext("2d");

 // Set the gauge value
 

 // Draw the gauge
 function drawGauge() {
   // Clear the canvas
   ctx.clearRect(0, 0, canvas.width, canvas.height);

   // Draw the background of the gauge
   ctx.beginPath();
   ctx.arc(150, 150, 130, 0, 2 * Math.PI);
   ctx.fillStyle = "lightgrey";
   ctx.fill();

    // Draw the green arc

var greenArcStart = minimumValue;
var greenArcEnd = maximumValue;
var greenArcStartAngle = (greenArcStart / 100 - 0.5) * Math.PI;
var greenArcEndAngle = (greenArcEnd / 100 - 0.5) * Math.PI;
ctx.beginPath();
ctx.arc(150, 150, 130, greenArcStartAngle, greenArcEndAngle);
ctx.lineWidth = 30;
ctx.strokeStyle = "green";
ctx.stroke();

// Draw the red arc
var redArcStart = (greenArcEnd < 0 ? greenArcEnd : greenArcEnd );
var redArcEnd = (greenArcStart > 0 ? greenArcStart : greenArcStart);
var redArcStartAngle = (redArcStart / 100 - 0.5) * Math.PI;
var redArcEndAngle = (redArcEnd / 100 - 0.5) * Math.PI;
ctx.beginPath();
ctx.arc(150, 150, 130, redArcStartAngle, redArcEndAngle);
ctx.lineWidth = 30;
ctx.strokeStyle = "red";
ctx.stroke();

   // Draw the gauge label
   ctx.textAlign = "center";
   ctx.textBaseline = "middle";
   ctx.fillStyle = "black";
   ctx.textAlign = "center";
   ctx.font = "40px Arial";
   ctx.fillText(currentValue, 150, 120);
   ctx.font = "20px Arial";
   ctx.fillText(tick, tickX, tickY);
   
   

   

   // Draw the arrow indicator
   var angle = (currentValue / 100 - 0.5) * Math.PI;
   var x = 150 + 110 * Math.cos(angle);
   var y = 150 + 110 * Math.sin(angle);
   ctx.beginPath();
   ctx.moveTo(150, 150);
   ctx.lineTo(x, y);
   ctx.lineWidth = 5;
   ctx.strokeStyle = "black";
   ctx.stroke();

ctx.beginPath();
ctx.moveTo(x, y);
ctx.lineTo(x - 10 * Math.cos(angle - Math.PI / 6), y - 10 * Math.sin(angle - Math.PI / 6));   
ctx.lineTo(x - 10 * Math.cos(angle + Math.PI / 6), y - 10 * Math.sin(angle + Math.PI / 6));
ctx.fillStyle = "black";
ctx.fill();

// Draw major ticks
var minValue = -100;
var maxValue = 100;
var numMajorTicks = 11;
var interval = (maxValue - minValue) / (numMajorTicks - 1);

for (var i = 0; i < numMajorTicks; i++) {
 var tick = minValue + i * interval;
 var tickAngle = (tick / 100) * 180 - 90;
 var tickX = 150 + 110 * Math.cos(tickAngle * Math.PI / 180);
 var tickY = 150 + 110 * Math.sin(tickAngle * Math.PI / 180);
 ctx.beginPath();
 ctx.moveTo(tickX, tickY);
 ctx.lineTo(tickX + 8 * Math.cos(tickAngle * Math.PI / 180), tickY + 8 * Math.sin(tickAngle * Math.PI / 180)); // decrease the length of the tick lines
 ctx.lineWidth = 2;
 ctx.strokeStyle = "black";
 ctx.stroke();
 ctx.fillText(tick === 100 || tick === -100 ? "+-100" : tick, tickX + 20 * Math.cos(tickAngle * Math.PI / 180), tickY + 20 * Math.sin(tickAngle * Math.PI / 180)); // adjust the position of the tick labels
}
}

//setInterval(()=> currentValue = randomRandom(), 2000);

//second chart ----------------------------------------------------------------------------------------------------


// Get the canvas element
var canvas1 = document.getElementById("speedometer2");
// Set the canvas size
canvas1.width = 300;
canvas1.height = 300;
// Get the canvas context
var ctx1 = canvas1.getContext("2d");

// Set the gauge value
var gaugeValue ;

// Draw the gauge
function drawGauge1() {
  // Clear the canvas
  ctx1.clearRect(0, 0, canvas1.width, canvas1.height);

  // Draw the background of the gauge
  ctx1.beginPath();
  ctx1.arc(150, 150, 130, 0, 2 * Math.PI);
  ctx1.fillStyle = "lightgray";
  ctx1.fill();

 
  // Draw the green arc
  var greenArcStart = minimumValue;
var greenArcEnd = maximumValue;
var greenArcStartAngle = (greenArcStart / 100 - 0.5) * Math.PI;
var greenArcEndAngle = (greenArcEnd / 100 - 0.5) * Math.PI;
ctx1.beginPath();
ctx1.arc(150, 150, 130, greenArcStartAngle, greenArcEndAngle);
ctx1.lineWidth = 30;
ctx1.strokeStyle = "green";
ctx1.stroke();


// Draw the red arc
var redArcStart = (greenArcEnd < 0 ? greenArcEnd : greenArcEnd );
var redArcEnd = (greenArcStart > 0 ? greenArcStart : greenArcStart);
var redArcStartAngle = (redArcStart / 180 - 0.5) * Math.PI;
var redArcEndAngle = (redArcEnd / 180 - 0.5) * Math.PI;
ctx1.beginPath();
ctx1.arc(150, 150, 130, redArcStartAngle, redArcEndAngle);
ctx1.lineWidth = 30;
ctx1.strokeStyle = "red";
ctx1.stroke();


  // Draw the gauge label
  ctx1.textAlign = "center";
  ctx1.textBaseline = "middle";
 
  ctx1.fillStyle = "black";
  ctx1.textAlign = "center";
  ctx1.font = "40px Arial";
  ctx1.fillText(currentValue, 150, 120);
  ctx1.fillText(tick, tickX, tickY);
  ctx1.font = "20px Arial";
  

  // Draw the arrow indicator
  var angle = (currentValue / 180) * Math.PI - (Math.PI / 2);
  var x = 150 + 110 * Math.cos(angle);
  var y = 150 + 110 * Math.sin(angle);
  ctx1.beginPath();
  ctx1.moveTo(150, 150);
  ctx1.lineTo(x, y);
  ctx1.lineWidth = 5;
  ctx1.strokeStyle = "black";
  ctx1.stroke();

ctx1.beginPath();
ctx1.moveTo(x, y);
ctx1.lineTo(x - 10 * Math.cos(angle - Math.PI / 6), y - 10 * Math.sin(angle - Math.PI / 6));   
ctx1.lineTo(x - 10 * Math.cos(angle + Math.PI / 6), y - 10 * Math.sin(angle + Math.PI / 6));
ctx1.fillStyle = "black";
ctx1.fill();

// Draw major ticks
var majorTicks = [-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];

for (var i = 0; i < majorTicks.length; i++) {
var tick = majorTicks[i];
var tickAngle = (tick / 180) * 180 - 90;
var tickX = 150 + 110 * Math.cos(tickAngle * Math.PI / 180);
var tickY = 150 + 110 * Math.sin(tickAngle * Math.PI / 180);
ctx1.beginPath();
ctx1.moveTo(tickX, tickY);
ctx1.lineTo(tickX + 8 * Math.cos(tickAngle * Math.PI / 180), tickY + 8 * Math.sin(tickAngle * Math.PI / 180));
ctx1.lineWidth = 2;
ctx1.strokeStyle = "black";
ctx1.stroke();
ctx1.fillText(tick === 180 || tick === -180 ? "+-180" : tick, tickX + 20 * Math.cos(tickAngle * Math.PI / 180), tickY + 20 * Math.sin(tickAngle * Math.PI / 180));
  //ctx.fillText(tick, tickX + 20 * Math.cos(tickAngle * Math.PI / 180), tickY + 20 * Math.sin(tickAngle * Math.PI / 180));
}
}



//third chart ----------------------------------------------------------------------------------------------------

var canvas2 = document.getElementById("speedometer3");
// Set the canvas size
canvas2.width = 300;
canvas2.height = 300;
// Get the canvas context
var ctx2 = canvas2.getContext("2d");

// Draw the gauge
function drawGauge2() {
// Clear the canvas
ctx2.clearRect(0, 0, canvas2.width, canvas2.height);

// Draw the background of the gauge
ctx2.beginPath();
ctx2.arc(150, 150, 130, 0, 2 * Math.PI);
ctx2.fillStyle = "lightgrey";
ctx2.fill();

// Draw the green arc
var greenArcStart = minimumValue;
var greenArcEnd = maximumValue;
var greenArcStartAngle = (greenArcStart / 500 - 0.5) * Math.PI;
var greenArcEndAngle = (greenArcEnd / 500 - 0.5) * Math.PI;
ctx2.beginPath();
ctx2.arc(150, 150, 130, greenArcStartAngle, greenArcEndAngle);
ctx2.lineWidth = 30;
ctx2.strokeStyle = "green";
ctx2.stroke();

// Draw the red arc
var redArcStart = (greenArcEnd < 0 ? greenArcEnd : greenArcEnd );
var redArcEnd = (greenArcStart > 0 ? greenArcStart : greenArcStart);
var redArcStartAngle = (redArcStart / 500 - 0.5) * Math.PI;
var redArcEndAngle = (redArcEnd / 500 - 0.5) * Math.PI;
ctx2.beginPath();
ctx2.arc(150, 150, 130, redArcStartAngle, redArcEndAngle);
ctx2.lineWidth = 30;
ctx2.strokeStyle = "red";
ctx2.stroke();

// Draw the gauge label
ctx2.textAlign = "center";
ctx2.textBaseline = "middle";
ctx2.fillStyle = "black";
ctx2.textAlign = "center";
ctx2.font = "40px Arial";
ctx2.fillText(currentValue, 150, 120);

// Draw the arrow indicator
// Draw the arrow indicator
var angle = (currentValue / 500 - 0.5) * Math.PI;
var x = 150 + 130 * Math.cos(angle);
var y = 150 + 130 * Math.sin(angle);

ctx2.beginPath();
ctx2.moveTo(150, 150);
ctx2.lineTo(x, y);
ctx2.lineWidth = 2;
ctx2.strokeStyle = "black";
ctx2.stroke();

// Draw the arrow tip
ctx2.beginPath();
ctx2.moveTo(x, y);
ctx2.lineTo(x - 5 * Math.cos(angle - Math.PI / 4), y - 5 * Math.sin(angle - Math.PI / 4));
ctx2.lineTo(x - 5 * Math.cos(angle + Math.PI / 4), y - 5 * Math.sin(angle + Math.PI / 4));
ctx2.fillStyle = "black";
ctx2.fill();


// Draw the major ticks
var majorTicks = [-500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500];
for (var i = 0; i < majorTicks.length; i++) {
  var tick = majorTicks[i];
  var tickAngle = (tick / 500) * 500 - 250;
  var tickX = 150 + 110 * Math.cos(tickAngle * Math.PI / 500);
  var tickY = 150 + 110 * Math.sin(tickAngle * Math.PI / 500);
  ctx2.beginPath();
  ctx2.moveTo(tickX, tickY);
  ctx2.lineTo(tickX + 8 * Math.cos(tickAngle * Math.PI / 500), tickY + 8 * Math.sin(tickAngle * Math.PI / 500));
  ctx2.lineWidth = 2;
  ctx2.strokeStyle = "black";
  ctx2.stroke();
  ctx2.font = "20px Arial";
  ctx2.fillText(tick === 500 || tick === -500 ? "+-500" : tick, tickX + 20 * Math.cos(tickAngle * Math.PI / 500), tickY + 20 * Math.sin(tickAngle * Math.PI / 500));
  
}
}








setInterval(()=> currentValue = randomRandom(), 2000);
setInterval(drawGauge, 2000);
setInterval(drawGauge1, 2000);
setInterval(drawGauge2, 2000);
//circle()


