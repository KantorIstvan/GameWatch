package com.gamewatch.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitReplyRequest {
    private String body;
}
