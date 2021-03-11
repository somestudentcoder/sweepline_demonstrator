//sweepline voronoi diagram.
//import { Point } from "./point";

const canvas = <HTMLCanvasElement> document.querySelector('#Canvas');
const width = canvas.width;
const height = canvas.height;

canvas.addEventListener("click", (e:MouseEvent) => newPoint(e.clientX , e.clientY));

const ctx = canvas.getContext('2d');
ctx.fillStyle = 'rgb(153, 153, 153)';
ctx.strokeRect(0, 0, width, height);

var pointList = [];

function newPoint(x, y)
{
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

function sweepLine()
{

}

class Point{
    public X: number;
    public Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }
}