/**
 * WBS visualization page
 */
import './base';

import * as d3 from 'd3';

import * as $ from 'jquery';

interface WBSDatum {
  size?: number;
  name: string;
  number: string;
  children: WBSDatum[];
}

interface Rectangle {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface TargetedHierarchyRectangularNode<T> extends d3.HierarchyRectangularNode<T> {
  target?: Rectangle;
}

interface PartitionLayout<T> extends d3.PartitionLayout<T> {
  (root: d3.HierarchyNode<T>): TargetedHierarchyRectangularNode<T>;
}

function dx(node: Rectangle) {
  return (node.x1 - node.x0);
}

function dy(node: Rectangle) {
  return (node.y1 - node.y0);
}

$(() => {
  const w = 1024;
  const h = 800;

  const layout = d3.partition<WBSDatum>().padding(1).size([h, w]) as PartitionLayout<WBSDatum>;

  const rectWidth = (d: Rectangle): number => dy(d) - 1;

  const rectHeight = (d: Rectangle): number => dx(d) - Math.min(1, dx(d) / 2);

  const labelPositionX =  (d: Rectangle): number => dx(d) / 2;

  const labelVisible = (d: Rectangle): number => (d.y1 <= w && d.y0 >= 0 && dx(d) > 16) ? 1 : 0;

  d3.json<WBSDatum>((window as any).json).then((wbsdata) => {

    const root = layout(d3.hierarchy(wbsdata).count());

    const svg = d3.select('#viz').append('svg')
                  .attr('viewBox', `0 0 ${w} ${h}`)
                  .style('font', '10px sans-serif');

    const cell =  svg.selectAll('g')
                     .data(root.descendants())
                     .join('g')
                     .attr('transform', (d) => `translate(${d.y0},${d.x0})`);

    const rect = cell.append('rect')
                     .style('cursor', 'pointer')
                     .attr('width', (d) => rectWidth(d))
                     .attr('height', (d) => rectHeight(d))
                     .attr('fill-opacity', 0.6)
                     .attr('fill', 'steelblue')
                     .on('click', clicked);

    const text = cell.append('text')
                     .style('user-select', 'none')
                     .attr('pointer-events', 'none')
                     .attr('x', 4)
                     .attr('y', (d) => labelPositionX(d))
                     .attr('fill-opacity', (d) => labelVisible(d));

    const tspan = text.append('tspan')
                      .attr('fill-opacity', (d) => labelVisible(d) * 0.7)
                      .text((d) => `${d.data.number} (${d.data.name})`);

    let focus = root;

    function clicked(p: TargetedHierarchyRectangularNode<WBSDatum> | null) {
      if (focus === p) {
        p = p.parent;
      }
      if (!p) {
        return;
      }
      focus = p;

      root.each((d) => {
        if (p) {
          d.target = {
            x0: (d.x0 - p.x0) / (p.x1 - p.x0) * h,
            x1: (d.x1 - p.x0) / (p.x1 - p.x0) * h,
            y0: d.y0 - p.y0,
            y1: d.y1 - p.y0,
          };
        }
      });

      const t = cell.transition()
                    .duration(750)
                    .attr('transform', (d) => d.target ? `translate(${d.target.y0},${d.target.x0})` : null);

      rect.transition(t).attr('height', (d) => d.target ? rectHeight(d.target) : null);
      text.transition(t).attr('y', (d) => d.target ? labelPositionX(d.target) : null);
      text.transition(t).attr('fill-opacity', (d) => d.target ? labelVisible(d.target) : null);
      tspan.transition(t).attr('fill-opacity', (d) => d.target ? labelVisible(d.target) * 0.7 : null);
    }
  });
});
