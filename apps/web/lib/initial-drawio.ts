export const INITIAL_DRAWIO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="Flowculus" modified="2026-08-22T00:00:00.000Z" agent="Flowculus" version="24.7.17" type="device">
  <diagram id="request-flow" name="Request handling flow">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1400" pageHeight="900" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <object id="start" label="Request received" flowculus-kind="start" flowculus-shape="start-event">
          <mxCell style="ellipse;whiteSpace=wrap;html=1;fillColor=#d09a14;strokeColor=#a87300;verticalAlign=top;verticalLabelPosition=bottom;" vertex="1" parent="1">
            <mxGeometry x="80" y="260" width="54" height="54" as="geometry" />
          </mxCell>
        </object>
        <object id="triage" label="Triage request&#xa;18 min" flowculus-kind="task" flowculus-duration-minutes="18" flowculus-processing-minutes="6" flowculus-waiting-minutes="12" flowculus-resource-rate-per-hour="60" flowculus-resource-pool-id="support">
          <mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#c0c9d2;align=center;verticalAlign=middle;" vertex="1" parent="1">
            <mxGeometry x="200" y="242" width="150" height="90" as="geometry" />
          </mxCell>
        </object>
        <object id="review" label="Review required?" flowculus-kind="gateway" flowculus-gateway-kind="xor">
          <mxCell style="shape=mxgraph.bpmn.gateway2;gwType=exclusive;outline=none;whiteSpace=wrap;html=1;fillColor=#fff3c7;strokeColor=#a87300;verticalAlign=bottom;verticalLabelPosition=top;" vertex="1" parent="1">
            <mxGeometry x="420" y="252" width="70" height="70" as="geometry" />
          </mxCell>
        </object>
        <object id="approve" label="Approve request&#xa;24 min" flowculus-kind="task" flowculus-duration-minutes="24" flowculus-processing-minutes="8" flowculus-waiting-minutes="16" flowculus-resource-rate-per-hour="72" flowculus-resource-pool-id="approval">
          <mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#c0c9d2;align=center;verticalAlign=middle;" vertex="1" parent="1">
            <mxGeometry x="580" y="140" width="160" height="90" as="geometry" />
          </mxCell>
        </object>
        <object id="auto" label="Auto-process&#xa;7 min" flowculus-kind="task" flowculus-duration-minutes="7" flowculus-processing-minutes="5" flowculus-waiting-minutes="2" flowculus-resource-rate-per-hour="48" flowculus-resource-pool-id="automation">
          <mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#c0c9d2;align=center;verticalAlign=middle;" vertex="1" parent="1">
            <mxGeometry x="580" y="344" width="160" height="90" as="geometry" />
          </mxCell>
        </object>
        <object id="finish" label="Request completed" flowculus-kind="end" flowculus-shape="end-event">
          <mxCell style="ellipse;shape=doubleEllipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#a87300;verticalAlign=top;verticalLabelPosition=bottom;" vertex="1" parent="1">
            <mxGeometry x="820" y="255" width="64" height="64" as="geometry" />
          </mxCell>
        </object>
        <object id="edge-start-triage" flowculus-kind="sequence">
          <mxCell edge="1" parent="1" source="start" target="triage" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;">
            <mxGeometry relative="1" as="geometry" />
          </mxCell>
        </object>
        <object id="edge-triage-review" flowculus-kind="sequence">
          <mxCell edge="1" parent="1" source="triage" target="review" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;">
            <mxGeometry relative="1" as="geometry" />
          </mxCell>
        </object>
        <object id="edge-review-approve" label="p = 0.6" flowculus-kind="sequence" flowculus-probability="0.6" flowculus-condition="yes">
          <mxCell edge="1" parent="1" source="review" target="approve" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;align=center;verticalAlign=bottom;">
            <mxGeometry relative="1" as="geometry">
              <mxPoint as="offset" y="-6" />
            </mxGeometry>
          </mxCell>
        </object>
        <object id="edge-review-auto" label="p = 0.4" flowculus-kind="sequence" flowculus-probability="0.4" flowculus-condition="no">
          <mxCell edge="1" parent="1" source="review" target="auto" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;align=center;verticalAlign=top;">
            <mxGeometry relative="1" as="geometry">
              <mxPoint as="offset" y="6" />
            </mxGeometry>
          </mxCell>
        </object>
        <object id="edge-approve-finish" flowculus-kind="sequence">
          <mxCell edge="1" parent="1" source="approve" target="finish" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;">
            <mxGeometry relative="1" as="geometry" />
          </mxCell>
        </object>
        <object id="edge-auto-finish" flowculus-kind="sequence">
          <mxCell edge="1" parent="1" source="auto" target="finish" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;">
            <mxGeometry relative="1" as="geometry" />
          </mxCell>
        </object>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
