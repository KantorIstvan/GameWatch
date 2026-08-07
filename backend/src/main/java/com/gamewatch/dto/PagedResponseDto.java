package com.gamewatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * No controller in this app exposes pagination to the client today - existing Pageable
 * usage is internal, always page 0, returned as a flat list. This is that missing
 * envelope, built for the admin directory rather than serializing Spring's Page&lt;T&gt;
 * directly (which carries Spring-internal fields not meant for a wire format).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedResponseDto<T> {

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    public static <S, T> PagedResponseDto<T> from(Page<S> page, Function<S, T> mapper) {
        return PagedResponseDto.<T>builder()
            .content(page.getContent().stream().map(mapper).collect(Collectors.toList()))
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .build();
    }
}
