//sweepline voronoi diagram.
//import { Point } from "./point";

const canvas = <HTMLCanvasElement> document.querySelector('#Canvas');
const button = <HTMLButtonElement>document.querySelector('#button');

const width = canvas.width;
const height = canvas.height;

canvas.addEventListener("click", (e:MouseEvent) => newPoint(e.clientX , e.clientY));
button.addEventListener("click", (e:MouseEvent) => animationID = setInterval(sweepLine, 10));

let clicked = false;
let animationID: number;
let current_width = 0;

const ctx = canvas.getContext('2d');

ctx.fillStyle = 'rgb(153, 153, 153)';
ctx.strokeRect(0, 0, width, height);

var pointList = [];

function newPoint(x, y)
{
    if(clicked)
    {
        return;
    }
    x = x - canvas.offsetLeft;
    y = y - canvas.offsetTop;
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, 360, false);
    ctx.fill();
    pointList.push(new Point(x,y));
}

function printList()
{
    console.log(pointList);
}

function drawPoints()
{
    pointList.forEach(point => {
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();
        ctx.arc(point.X, point.Y, 3.5, 0, 360, false);
        ctx.fill();
    });
}

function sweepLine()
{
    //CHECKS
    if(!clicked)
    {
        button.disabled = true;
        clicked = true;

        //ALGORITHM INIT
        var siteEvents = pointList.slice(0);
        siteEvents.sort(function(a,b){
            var diff = b.Y - a.Y;
            if (diff) {return diff;}
            return b.X - a.X;
        });
        console.log(siteEvents)
    }
    if(pointList.length == 0)
    {
        clearInterval(animationID);
        clicked = false;
        button.disabled = false;
        return;
    }

    //ALGORITHM
    

    //CLEAR AND REDRAW
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgb(153, 153, 153)';
    ctx.strokeRect(0, 0, width, height);
    drawPoints();
    ctx.strokeStyle = 'rgb(0, 0, 0)';
    ctx.moveTo(current_width, 0);
    ctx.lineTo(current_width, canvas.height);
    ctx.stroke();
    current_width += 1;
}

class Point{
    public X: number;
    public Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }
}