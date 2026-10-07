import { ArgumentsHost, BadRequestException, Body, Catch, Controller, Delete, ExceptionFilter, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UseFilters, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { FirebaseAuthGuard, type AuthenticatedRequest } from '../auth/firebase-auth.guard';
import { PortfolioInputError } from './domain/ledger';
import { currency, parseCreate, parseSaveScenario, parseScenario, parseTransaction, parseUpdate } from './domain/portfolio-input';
import { PortfolioService } from './portfolio.service';

@Catch(PortfolioInputError)
export class PortfolioInputFilter implements ExceptionFilter {
  catch(error: PortfolioInputError, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(400).json({
      statusCode: 400,
      message: error.message,
      error: 'Bad Request'
    });
  }
}

@Controller('api/portfolios')
@UseGuards(FirebaseAuthGuard)
@UseFilters(PortfolioInputFilter)
export class PortfolioController {
  constructor(private readonly service: PortfolioService) { }
  private uid(request: AuthenticatedRequest) {
    if (!request.user?.uid) throw new UnauthorizedException('Sign in to manage portfolios.');
    return request.user.uid;
  }
  @Get()
  list(@Req() request: AuthenticatedRequest, @Query('includeArchived') archived?: string) {
    if (archived !== undefined && archived !== 'true' && archived !== 'false') throw new BadRequestException('Invalid includeArchived value.');
    return this.service.list(this.uid(request), archived === 'true');
  }
  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.create(this.uid(request), parseCreate(body));
  }
  @Get('instruments')
  instruments(@Req() request: AuthenticatedRequest, @Query('q') query = '', @Query('currency') code?: string) {
    this.uid(request);
    if (typeof query !== 'string' || query.length > 80) throw new BadRequestException('Search query is too long.');
    return this.service.instruments(query, code === undefined ? undefined : currency(code));
  }
  @Get('combined')
  combined(@Req() request: AuthenticatedRequest, @Query('currency') code = 'USD') {
    return this.service.combined(this.uid(request), currency(code));
  }
  @Get(':id')
  detail(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.detail(this.uid(request), id);
  }
  @Get(':id/ledger')
  ledger(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.ledger(this.uid(request), id);
  }
  @Get(':id/settings')
  settings(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.settings(this.uid(request), id);
  }
  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.service.update(this.uid(request), id, parseUpdate(body));
  }
  @Delete(':id')
  delete(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.delete(this.uid(request), id);
  }
  @Post(':id/transactions')
  transaction(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.service.addTransaction(this.uid(request), id, parseTransaction(body));
  }
  @Post(':id/transactions/:transactionId/void')
  void(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Param('transactionId') transactionId: string) {
    return this.service.voidTransaction(this.uid(request), id, transactionId);
  }
  @Get(':id/activity')
  activity(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Query('before') before?: string) {
    if (before !== undefined && !/^\d{1,6}$/.test(before)) throw new BadRequestException('Invalid activity cursor.');
    return this.service.activity(this.uid(request), id, before === undefined ? null : Number(before));
  }
  @Post(':id/scenarios/preview')
  preview(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.service.preview(this.uid(request), id, parseScenario(body));
  }
  @Post(':id/scenarios')
  saveScenario(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    const input = parseSaveScenario(body);
    return this.service.saveScenario(this.uid(request), id, input.requestId, input.previewToken, input.input);
  }
  @Get(':id/scenarios/:scenarioId')
  scenario(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Param('scenarioId') scenarioId: string) {
    return this.service.scenario(this.uid(request), id, scenarioId);
  }
}
