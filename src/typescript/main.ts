//sweepline voronoi diagram.
//import { Point } from "./point";

const canvas = <HTMLCanvasElement> document.querySelector('#Canvas');
const button = <HTMLButtonElement>document.querySelector('#button');

//Width and Height of Canvas
const width = canvas.width;
const height = canvas.height;

//Event Listeners for interaction
canvas.addEventListener("click", (e:MouseEvent) => newPoint(e.clientX , e.clientY));
button.addEventListener("click", (e:MouseEvent) => animationID = setInterval(sweepLine, 10));

//Animation variables
let clicked = false;
let animationID: number;
let line_position = 0;

//Fortune algorithm variables
var siteEvents = [];
var circleEvents = [];
var beachLine = null;

var regions = [];



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

function handleSite(site: Point)
{
    regions.push(new Region(site));

    addToBeachline(site);
}

function addToBeachline(site: Point)
{
    if(beachLine == null)
    {
        beachLine = new TreeNode(site, null, null);    
    }
    else
    {
        findSpotInTree(site, beachLine);
    }
}

function findSpotInTree(site: Point, currentNode: TreeNode)
{
    if(currentNode.site.Y >= site.Y)
    {
        if(currentNode.left == null)
        {
            currentNode.left = new TreeNode(site, null, null);
        }
        else
        {
            findSpotInTree(site, currentNode.left);
        }
    }
    else if(currentNode.site.Y < site.Y)
    {
        if(currentNode.right == null)
        {
            currentNode.right = new TreeNode(site, null, null);
        }
        else
        {
            findSpotInTree(site, currentNode.right);
        }
    }
}

function removeFromBeachline(site: Point)
{

}



//MAIN ENTRY POINT FOR ALGORITHM
function sweepLine()
{
    //CHECKS
    if(!clicked)
    {
        button.disabled = true;
        clicked = true;

        //ALGORITHM INIT
        siteEvents = pointList.slice(0);
        siteEvents.sort(function(a,b){
            var diff = b.X - a.X;
            if (diff) {return diff;}
            return b.Y - a.Y;
        });
        //console.log(siteEvents)
    }
    //Don't start before we have points.
    if(pointList.length == 0)
    {
        clearInterval(animationID);
        clicked = false;
        button.disabled = false;
        return;
    }

    //ALGORITHM
    if(siteEvents.length != 0 
        && line_position == siteEvents[siteEvents.length -1].X)
    {
        let site_to_handle = siteEvents.pop();
        handleSite(site_to_handle);

        //Check if theres another at this position.
        if(siteEvents.length != 0 
            && line_position == siteEvents[siteEvents.length -1].X)
        {
            sweepLine();
        }
    }
    
    if(circleEvents.length != 0 
            && line_position == circleEvents[circleEvents.length -1].X)
    {
        let vertex = circleEvents.pop();
        removeFromBeachline(vertex);

        //Check if theres another at this position.
        if(circleEvents.length != 0 
            && line_position == circleEvents[circleEvents.length -1].X)
        {
            sweepLine();
        }
    }
    
    //CLEAR AND REDRAW
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgb(153, 153, 153)';
    ctx.strokeRect(0, 0, width, height);
    drawPoints();
    ctx.strokeStyle = 'rgb(0, 0, 0)';
    ctx.moveTo(line_position, 0);
    ctx.lineTo(line_position, canvas.height);
    ctx.stroke();
    drawParabolas(beachLine, line_position);
    line_position += 1;

    //END CONDITION
    if(line_position == width
        && siteEvents.length == 0
        && circleEvents.length == 0)
    {
        clearInterval(animationID);
    }
}

//RENDERING


//Mainly from:
//https://jtauber.com/blog/2008/11/29/voronoi_canvas_tutorial_part_iii/
function drawParabola(f: Point, d_X: number)
{
    let alpha = Math.sqrt((d_X*d_X)-(f.X*f.X));
    let p0y = f.Y - alpha;
    let p0x = 0;
    let cp_y = f.Y;
    let cp_x = f.X + d_X;
    let p1y = f.Y + alpha;
    let p1x = 0;

    ctx.strokeStyle = "rgb(100, 100, 100)";
    //ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.quadraticCurveTo(cp_x, cp_y, p1x, p1y);
    ctx.stroke();
    //ctx.fill();
}

function drawParabolas(node: TreeNode, lineX: number)
{
    if(node == null)
    {
        return;
    }


    drawParabola(node.site, lineX);
    if(node.left != null)
    {
        drawParabolas(node.left, lineX);
    }
    if(node.right != null)
    {
        drawParabolas(node.right, lineX);
    }
}


//DATASTRUCTURES
class Point{
    public X: number;
    public Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }
}

class Edge{
    public left_site: Point;
    public right_site: Point;

    public start: Point;
    public end: Point;

    constructor(ls: Point, rs: Point, s: Point, e: Point) {
        this.left_site = ls;
        this.right_site = rs;
        this.start = s;
        this.end = e;
    }
}

class Region{
    public site: Point;
    public edges: [Edge];

    constructor(s: Point) {
        this.site = s;
    }
}

class TreeNode{
    public site: Point;
    public left: TreeNode;
    public right: TreeNode;

    constructor(s: Point, l: TreeNode, r: TreeNode)
    {
        this.site = s;
        this.left = l;
        this.right = r;
    }
}