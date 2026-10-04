import { useState } from "react";

// 드래그 중인 대상 (HTML5 DnD는 dragover에서 dataTransfer를 읽을 수 없어 모듈 변수로 공유)
export let DRAG=null;
export function useDrop(){const[over,setOver]=useState(null);
  const src=(payload)=>({draggable:true,onDragStart:e=>{DRAG=payload;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','');e.currentTarget.classList.add('dragging')},
    onDragEnd:e=>{DRAG=null;setOver(null);e.currentTarget.classList.remove('dragging')}});
  const dst=(key,accept,onDrop)=>({onDragOver:e=>{if(DRAG&&accept(DRAG)){e.preventDefault();e.dataTransfer.dropEffect='move';if(over!==key)setOver(key)}},
    onDragLeave:e=>{if(!e.currentTarget.contains(e.relatedTarget)&&over===key)setOver(null)},
    onDrop:e=>{if(DRAG&&accept(DRAG)){e.preventDefault();onDrop(DRAG);DRAG=null;setOver(null)}}});
  return{over,src,dst}}
